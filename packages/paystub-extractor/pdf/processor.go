package pdf

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/basic-budget/paystub-extractor/extractor"
	"github.com/ledongthuc/pdf"
	"github.com/otiai10/gosseract/v2"
)

// Processor handles PDF processing operations
type Processor struct {
	tessClient   *gosseract.Client
	enableOCR    bool
	tempDir      string
	ocrLanguages []string
}

// NewProcessor creates a new PDF processor
func NewProcessor(enableOCR bool) *Processor {
	return &Processor{
		enableOCR:    enableOCR,
		tempDir:      os.TempDir(),
		ocrLanguages: []string{"eng"},
	}
}

// ProcessPDF extracts paystub data from a PDF file
func (p *Processor) ProcessPDF(pdfData []byte) (*extractor.PaystubData, error) {
	// First try text extraction
	text, err := p.extractTextFromPDF(pdfData)
	if err == nil && len(strings.TrimSpace(text)) > 100 {
		// We have meaningful text, process it
		data, err := extractor.ExtractFromText(text)
		if err == nil && data.Confidence > 0.5 {
			return data, nil
		}
	}

	// If text extraction failed or confidence is low, try OCR if enabled
	if p.enableOCR {
		ocrText, err := p.performOCR(pdfData)
		if err == nil && ocrText != "" {
			// Combine both texts if we have them
			combinedText := text + "\n" + ocrText
			return extractor.ExtractFromText(combinedText)
		}
	}

	// If we only have text extraction result
	if text != "" {
		return extractor.ExtractFromText(text)
	}

	return nil, fmt.Errorf("unable to extract meaningful data from PDF")
}

// extractTextFromPDF extracts text content from PDF
func (p *Processor) extractTextFromPDF(pdfData []byte) (string, error) {
	reader := bytes.NewReader(pdfData)
	
	// Read the PDF
	pdfReader, err := pdf.NewReader(reader, int64(len(pdfData)))
	if err != nil {
		return "", fmt.Errorf("failed to read PDF: %w", err)
	}

	// Extract text from all pages
	var textBuilder strings.Builder
	numPages := pdfReader.NumPage()
	
	for pageNum := 1; pageNum <= numPages; pageNum++ {
		page := pdfReader.Page(pageNum)
		if page.V.IsNull() {
			continue
		}
		
		// Extract text from page
		text, err := p.extractPageText(page)
		if err != nil {
			// Continue with other pages even if one fails
			continue
		}
		
		textBuilder.WriteString(text)
		textBuilder.WriteString("\n")
	}

	finalText := textBuilder.String()
	
	// If native extraction didn't work well, try external tools
	if len(strings.TrimSpace(finalText)) < 50 {
		// Try using pdftotext if available (more reliable for complex PDFs)
		if p.isPdftotextAvailable() {
			pdfText, err := p.extractWithPdftotext(pdfData)
			if err == nil && pdfText != "" {
				return pdfText, nil
			}
		}
	}

	return finalText, nil
}

// extractPageText extracts text from a specific page
func (p *Processor) extractPageText(page pdf.Page) (string, error) {
	var text strings.Builder
	
	// Get content streams
	content := page.Content()
	
	// Parse text from content
	// This is a simplified approach - for production you might want to use
	// a more sophisticated PDF text extraction library
	textContent := content.Text
	for _, t := range textContent {
		text.WriteString(t.S)
		text.WriteString(" ")
	}
	
	return text.String(), nil
}

// unescapePDFString unescapes PDF string literals
func unescapePDFString(s string) string {
	// Basic PDF string unescaping
	s = strings.ReplaceAll(s, "\\n", "\n")
	s = strings.ReplaceAll(s, "\\r", "\r")
	s = strings.ReplaceAll(s, "\\t", "\t")
	s = strings.ReplaceAll(s, "\\(", "(")
	s = strings.ReplaceAll(s, "\\)", ")")
	s = strings.ReplaceAll(s, "\\\\", "\\")
	return s
}

// performOCR performs OCR on the PDF
func (p *Processor) performOCR(pdfData []byte) (string, error) {
	// Check if Tesseract is available
	if !p.isTesseractAvailable() {
		return "", fmt.Errorf("Tesseract OCR is not available")
	}

	// Convert PDF to images first
	images, err := p.pdfToImages(pdfData)
	if err != nil {
		return "", fmt.Errorf("failed to convert PDF to images: %w", err)
	}
	defer p.cleanupTempFiles(images)

	// Initialize Tesseract client
	client := gosseract.NewClient()
	defer client.Close()

	// Configure Tesseract
	client.SetLanguage(p.ocrLanguages...)
	client.SetPageSegMode(gosseract.PSM_AUTO)
	
	// Process each image
	var textBuilder strings.Builder
	for _, imgPath := range images {
		if err := client.SetImage(imgPath); err != nil {
			continue
		}
		
		text, err := client.Text()
		if err != nil {
			continue
		}
		
		textBuilder.WriteString(text)
		textBuilder.WriteString("\n")
	}

	return textBuilder.String(), nil
}

// isTesseractAvailable checks if Tesseract is installed
func (p *Processor) isTesseractAvailable() bool {
	cmd := exec.Command("tesseract", "--version")
	err := cmd.Run()
	return err == nil
}

// pdfToImages converts PDF pages to images using ImageMagick or Ghostscript
func (p *Processor) pdfToImages(pdfData []byte) ([]string, error) {
	// Save PDF to temp file
	tempPDF := filepath.Join(p.tempDir, fmt.Sprintf("paystub_%d.pdf", os.Getpid()))
	if err := os.WriteFile(tempPDF, pdfData, 0644); err != nil {
		return nil, err
	}
	defer os.Remove(tempPDF)

	// Try to use pdftoppm (from poppler-utils) first as it's more reliable
	if p.isPdftoppmAvailable() {
		return p.convertWithPdftoppm(tempPDF)
	}

	// Fallback to ImageMagick
	if p.isImageMagickAvailable() {
		return p.convertWithImageMagick(tempPDF)
	}

	// Fallback to Ghostscript
	if p.isGhostscriptAvailable() {
		return p.convertWithGhostscript(tempPDF)
	}

	return nil, fmt.Errorf("no PDF to image converter available (install poppler-utils, ImageMagick, or Ghostscript)")
}

// isPdftoppmAvailable checks if pdftoppm is installed
func (p *Processor) isPdftoppmAvailable() bool {
	cmd := exec.Command("pdftoppm", "-v")
	err := cmd.Run()
	return err == nil
}

// convertWithPdftoppm converts PDF to images using pdftoppm
func (p *Processor) convertWithPdftoppm(pdfPath string) ([]string, error) {
	outputPrefix := filepath.Join(p.tempDir, fmt.Sprintf("paystub_%d", os.Getpid()))
	
	cmd := exec.Command("pdftoppm",
		"-png",           // Output PNG format
		"-r", "300",      // 300 DPI resolution
		pdfPath,
		outputPrefix,
	)
	
	if err := cmd.Run(); err != nil {
		return nil, err
	}

	// Find generated images
	pattern := outputPrefix + "-*.png"
	images, err := filepath.Glob(pattern)
	if err != nil {
		return nil, err
	}

	if len(images) == 0 {
		// Try single page pattern
		singlePage := outputPrefix + "-1.png"
		if _, err := os.Stat(singlePage); err == nil {
			images = []string{singlePage}
		}
	}

	return images, nil
}

// isImageMagickAvailable checks if ImageMagick is installed
func (p *Processor) isImageMagickAvailable() bool {
	cmd := exec.Command("convert", "--version")
	err := cmd.Run()
	return err == nil
}

// convertWithImageMagick converts PDF to images using ImageMagick
func (p *Processor) convertWithImageMagick(pdfPath string) ([]string, error) {
	outputPattern := filepath.Join(p.tempDir, fmt.Sprintf("paystub_%d_%%d.png", os.Getpid()))
	
	cmd := exec.Command("convert",
		"-density", "300",         // 300 DPI
		"-quality", "100",         // Max quality
		pdfPath,
		outputPattern,
	)
	
	if err := cmd.Run(); err != nil {
		return nil, err
	}

	// Find generated images
	pattern := strings.Replace(outputPattern, "%d", "*", 1)
	return filepath.Glob(pattern)
}

// isGhostscriptAvailable checks if Ghostscript is installed
func (p *Processor) isGhostscriptAvailable() bool {
	cmd := exec.Command("gs", "--version")
	err := cmd.Run()
	return err == nil
}

// convertWithGhostscript converts PDF to images using Ghostscript
func (p *Processor) convertWithGhostscript(pdfPath string) ([]string, error) {
	outputPattern := filepath.Join(p.tempDir, fmt.Sprintf("paystub_%d_%%03d.png", os.Getpid()))
	
	cmd := exec.Command("gs",
		"-dNOPAUSE",
		"-dBATCH",
		"-sDEVICE=png16m",
		"-r300",                           // 300 DPI
		"-sOutputFile="+outputPattern,
		pdfPath,
	)
	
	if err := cmd.Run(); err != nil {
		return nil, err
	}

	// Find generated images
	pattern := strings.Replace(outputPattern, "%03d", "*", 1)
	return filepath.Glob(pattern)
}

// cleanupTempFiles removes temporary image files
func (p *Processor) cleanupTempFiles(files []string) {
	for _, file := range files {
		os.Remove(file)
	}
}

// ProcessPDFFromFile processes a PDF file from disk
func (p *Processor) ProcessPDFFromFile(filePath string) (*extractor.PaystubData, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF file: %w", err)
	}
	return p.ProcessPDF(data)
}

// ProcessPDFFromReader processes a PDF from an io.Reader
func (p *Processor) ProcessPDFFromReader(reader io.Reader) (*extractor.PaystubData, error) {
	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF data: %w", err)
	}
	return p.ProcessPDF(data)
}

// ExtractTextWithFallback attempts text extraction with multiple methods
func (p *Processor) ExtractTextWithFallback(pdfData []byte) (string, error) {
	// Try native Go PDF library first
	text, err := p.extractTextFromPDF(pdfData)
	if err == nil && len(strings.TrimSpace(text)) > 50 {
		return text, nil
	}

	// Try using pdftotext if available (more reliable for complex PDFs)
	if p.isPdftotextAvailable() {
		pdfText, err := p.extractWithPdftotext(pdfData)
		if err == nil && pdfText != "" {
			return pdfText, nil
		}
	}

	// Fallback to OCR if enabled
	if p.enableOCR {
		ocrText, err := p.performOCR(pdfData)
		if err == nil && ocrText != "" {
			return ocrText, nil
		}
	}

	if text != "" {
		return text, nil
	}

	return "", fmt.Errorf("unable to extract text from PDF")
}

// isPdftotextAvailable checks if pdftotext is installed
func (p *Processor) isPdftotextAvailable() bool {
	cmd := exec.Command("pdftotext", "-v")
	err := cmd.Run()
	return err == nil
}

// extractWithPdftotext uses pdftotext command for extraction
func (p *Processor) extractWithPdftotext(pdfData []byte) (string, error) {
	// Save PDF to temp file
	tempPDF := filepath.Join(p.tempDir, fmt.Sprintf("paystub_%d.pdf", os.Getpid()))
	if err := os.WriteFile(tempPDF, pdfData, 0644); err != nil {
		return "", err
	}
	defer os.Remove(tempPDF)

	// Run pdftotext
	cmd := exec.Command("pdftotext", "-layout", tempPDF, "-")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	return string(output), nil
}