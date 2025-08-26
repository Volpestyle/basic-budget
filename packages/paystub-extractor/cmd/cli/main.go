package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/basic-budget/paystub-extractor/extractor"
	"github.com/basic-budget/paystub-extractor/pdf"
)

func main() {
	var (
		inputFile = flag.String("file", "", "Path to PDF file to process")
		enableOCR = flag.Bool("ocr", true, "Enable OCR for scanned documents")
		output    = flag.String("output", "json", "Output format: json, pretty, summary")
		help      = flag.Bool("help", false, "Show help message")
	)

	flag.Parse()

	if *help || *inputFile == "" {
		printUsage()
		os.Exit(0)
	}

	// Check if file exists
	if _, err := os.Stat(*inputFile); os.IsNotExist(err) {
		log.Fatalf("File not found: %s", *inputFile)
	}

	// Create processor
	processor := pdf.NewProcessor(*enableOCR)

	// Process file
	fmt.Printf("Processing %s...\n", *inputFile)
	result, err := processor.ProcessPDFFromFile(*inputFile)
	if err != nil {
		log.Fatalf("Error processing PDF: %v", err)
	}

	// Output results
	switch *output {
	case "json":
		outputJSON(result)
	case "pretty":
		outputPretty(result)
	case "summary":
		outputSummary(result)
	default:
		log.Fatalf("Unknown output format: %s", *output)
	}
}

func printUsage() {
	fmt.Println("Paystub Extractor CLI")
	fmt.Println("=====================")
	fmt.Println()
	fmt.Println("Usage: cli -file <path-to-pdf> [options]")
	fmt.Println()
	fmt.Println("Options:")
	fmt.Println("  -file string    Path to PDF file to process (required)")
	fmt.Println("  -ocr            Enable OCR for scanned documents (default: true)")
	fmt.Println("  -output string  Output format: json, pretty, summary (default: json)")
	fmt.Println("  -help           Show this help message")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  cli -file paystub.pdf")
	fmt.Println("  cli -file paystub.pdf -output pretty")
	fmt.Println("  cli -file scanned.pdf -ocr -output summary")
}

func outputJSON(data interface{}) {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		log.Fatalf("Error encoding JSON: %v", err)
	}
}

func outputPretty(data interface{}) {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}

	fmt.Println("\n=== EXTRACTION RESULTS ===")
	fmt.Println(string(jsonData))
}

func outputSummary(data interface{}) {
	// Type assertion to access struct fields
	if paystub, ok := data.(*extractor.PaystubData); ok {
		fmt.Println("\n=== PAYSTUB SUMMARY ===")
		fmt.Println()
		
		if paystub.Employer.Name != "" {
			fmt.Printf("Employer:        %s\n", paystub.Employer.Name)
		}
		if paystub.Employee.Name != "" {
			fmt.Printf("Employee:        %s\n", paystub.Employee.Name)
		}
		
		fmt.Println()
		
		if paystub.PayPeriodStart != "" && paystub.PayPeriodEnd != "" {
			fmt.Printf("Pay Period:      %s to %s\n", paystub.PayPeriodStart, paystub.PayPeriodEnd)
		}
		if paystub.PayDate != "" {
			fmt.Printf("Pay Date:        %s\n", paystub.PayDate)
		}
		if paystub.PayFrequency != "unknown" {
			fmt.Printf("Pay Frequency:   %s\n", paystub.PayFrequency)
		}
		
		fmt.Println()
		
		fmt.Printf("Gross Pay:       $%.2f\n", paystub.GrossPay)
		fmt.Printf("Net Pay:         $%.2f\n", paystub.NetPay)
		
		totalDeductions := paystub.GrossPay - paystub.NetPay
		if totalDeductions > 0 {
			fmt.Printf("Total Deductions: $%.2f\n", totalDeductions)
		}
		
		fmt.Println()
		
		if len(paystub.Earnings) > 0 {
			fmt.Println("Earnings:")
			for _, earning := range paystub.Earnings {
				fmt.Printf("  - %s: $%.2f", earning.Description, earning.Amount)
				if earning.Hours > 0 {
					fmt.Printf(" (%.2f hours @ $%.2f/hr)", earning.Hours, earning.Rate)
				}
				fmt.Println()
			}
		}
		
		if len(paystub.Deductions) > 0 {
			fmt.Println("\nDeductions:")
			for _, deduction := range paystub.Deductions {
				fmt.Printf("  - %s: $%.2f", deduction.Description, deduction.Amount)
				if deduction.PreTax {
					fmt.Print(" (pre-tax)")
				}
				fmt.Println()
			}
		}
		
		if len(paystub.Taxes) > 0 {
			fmt.Println("\nTaxes:")
			for _, tax := range paystub.Taxes {
				fmt.Printf("  - %s: $%.2f\n", tax.Description, tax.Amount)
			}
		}
		
		fmt.Println()
		fmt.Printf("Confidence Score: %.0f%%\n", paystub.Confidence*100)
	}
}