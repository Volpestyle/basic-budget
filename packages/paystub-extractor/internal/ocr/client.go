package ocr

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Client handles OCR operations
type Client struct {
	tesseractPath string
	tempDir       string
}

// NewClient creates a new OCR client
func NewClient() (*Client, error) {
	// Check if tesseract is installed
	tesseractPath, err := exec.LookPath("tesseract")
	if err != nil {
		// Try common installation paths
		commonPaths := []string{
			"/usr/local/bin/tesseract",
			"/usr/bin/tesseract",
			"/opt/homebrew/bin/tesseract",
		}
		
		for _, path := range commonPaths {
			if _, err := os.Stat(path); err == nil {
				tesseractPath = path
				break
			}
		}
		
		if tesseractPath == "" {
			return nil, fmt.Errorf("tesseract not found. Please install tesseract-ocr")
		}
	}

	// Create temp directory for processing
	tempDir := filepath.Join(os.TempDir(), "paystub-ocr")
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}

	return &Client{
		tesseractPath: tesseractPath,
		tempDir:       tempDir,
	}, nil
}

// ProcessImage performs OCR on an image
func (c *Client) ProcessImage(data []byte) (string, error) {
	// Create temporary file
	tempFile := filepath.Join(c.tempDir, fmt.Sprintf("img_%d", os.Getpid()))
	inputFile := tempFile + ".png"
	
	if err := os.WriteFile(inputFile, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write temp file: %w", err)
	}
	defer os.Remove(inputFile)

	// Run tesseract
	outputFile := tempFile
	cmd := exec.Command(c.tesseractPath, inputFile, outputFile, "-l", "eng", "--psm", "6")
	
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("tesseract failed: %v, stderr: %s", err, stderr.String())
	}

	// Read output
	outputPath := outputFile + ".txt"
	output, err := os.ReadFile(outputPath)
	if err != nil {
		return "", fmt.Errorf("failed to read OCR output: %w", err)
	}
	defer os.Remove(outputPath)

	return string(output), nil
}

// ProcessPDF performs OCR on a PDF
func (c *Client) ProcessPDF(data []byte) (string, error) {
	// For PDF, we need to convert to images first
	// This is a simplified version - in production you might use poppler-utils or similar
	
	// Create temporary PDF file
	tempFile := filepath.Join(c.tempDir, fmt.Sprintf("pdf_%d.pdf", os.Getpid()))
	if err := os.WriteFile(tempFile, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write temp PDF: %w", err)
	}
	defer os.Remove(tempFile)

	// Check if we have ImageMagick or similar for PDF to image conversion
	convertPath, err := exec.LookPath("convert")
	if err != nil {
		// Try using tesseract directly on PDF if it supports it
		outputFile := strings.TrimSuffix(tempFile, ".pdf")
		cmd := exec.Command(c.tesseractPath, tempFile, outputFile, "-l", "eng", "--psm", "6", "pdf")
		
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		
		if err := cmd.Run(); err != nil {
			// If direct PDF processing fails, return error
			return "", fmt.Errorf("PDF OCR requires ImageMagick (convert command) or Tesseract with PDF support: %v", err)
		}
		
		// Read output
		outputPath := outputFile + ".txt"
		output, err := os.ReadFile(outputPath)
		if err != nil {
			return "", fmt.Errorf("failed to read OCR output: %w", err)
		}
		defer os.Remove(outputPath)
		
		return string(output), nil
	}

	// Convert PDF to images using ImageMagick
	imagePattern := filepath.Join(c.tempDir, fmt.Sprintf("page_%d_%%d.png", os.Getpid()))
	cmd := exec.Command(convertPath, "-density", "300", tempFile, imagePattern)
	
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("failed to convert PDF to images: %w", err)
	}

	// Process each page image
	var textBuilder strings.Builder
	pageNum := 0
	
	for {
		imagePath := filepath.Join(c.tempDir, fmt.Sprintf("page_%d_%d.png", os.Getpid(), pageNum))
		if _, err := os.Stat(imagePath); os.IsNotExist(err) {
			break
		}
		defer os.Remove(imagePath)

		// Run tesseract on this page
		outputFile := strings.TrimSuffix(imagePath, ".png")
		cmd := exec.Command(c.tesseractPath, imagePath, outputFile, "-l", "eng", "--psm", "6")
		
		if err := cmd.Run(); err != nil {
			// Continue even if one page fails
			pageNum++
			continue
		}

		// Read output
		outputPath := outputFile + ".txt"
		output, err := os.ReadFile(outputPath)
		if err == nil {
			textBuilder.WriteString(string(output))
			textBuilder.WriteString("\n--- Page Break ---\n")
		}
		os.Remove(outputPath)
		
		pageNum++
	}

	if textBuilder.Len() == 0 {
		return "", fmt.Errorf("no text extracted from PDF")
	}

	return textBuilder.String(), nil
}

// Close cleans up the OCR client
func (c *Client) Close() error {
	// Clean up temp directory
	return os.RemoveAll(c.tempDir)
}