package extractor

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/ledongthuc/pdf"
)

// extractPDFText extracts text from PDF using a simple text extraction library
func extractPDFText(data []byte) (string, error) {
	reader := bytes.NewReader(data)
	
	// Try using ledongthuc/pdf for simple text extraction
	pdfReader, err := pdf.NewReader(reader, int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("failed to read PDF: %w", err)
	}

	var textBuilder strings.Builder
	
	// Extract text from all pages
	for i := 1; i <= pdfReader.NumPage(); i++ {
		page := pdfReader.Page(i)
		if page.V.IsNull() {
			continue
		}
		
		text, err := page.GetPlainText(nil)
		if err != nil {
			// Continue even if one page fails
			continue
		}
		
		textBuilder.WriteString(text)
		textBuilder.WriteString("\n")
	}

	extractedText := textBuilder.String()
	
	// Clean up the text
	extractedText = cleanPDFText(extractedText)
	
	return extractedText, nil
}

// cleanPDFText cleans up extracted PDF text
func cleanPDFText(text string) string {
	// Remove excessive whitespace
	text = strings.ReplaceAll(text, "\t", " ")
	
	// Replace multiple spaces with single space
	for strings.Contains(text, "  ") {
		text = strings.ReplaceAll(text, "  ", " ")
	}
	
	// Replace multiple newlines with double newline
	for strings.Contains(text, "\n\n\n") {
		text = strings.ReplaceAll(text, "\n\n\n", "\n\n")
	}
	
	// Trim each line
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(line)
	}
	
	return strings.Join(lines, "\n")
}