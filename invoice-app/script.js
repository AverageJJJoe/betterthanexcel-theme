const { createApp } = Vue;
const { jsPDF } = window.jspdf;

console.log('Invoice Data:', invoiceData);

createApp({
    data() {
        return {
            sender: {
                name: '',
                address: '',
                phone: '',
                email: ''
            },
            recipient: {
                name: '',
                address: ''
            },
            invoice: {
                number: '',
                date: new Date().toISOString().split('T')[0],
                items: [],
                taxType: 'sales',
                taxRate: 0,
                notes: ''
            },
            logo: null,
            invoiceCount: 0
        }
    },
    methods: {
        generateInvoiceNumber() {
            return 'INV-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        },
        addItem() {
            this.invoice.items.push({
                description: '',
                quantity: 1,
                unitPrice: 0
            });
        },
        removeItem(index) {
            this.invoice.items.splice(index, 1);
        },
        calculateItemTotal(item) {
            return (item.quantity * item.unitPrice).toFixed(2);
        },
        handleLogoUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.logo = e.target.result;
            };
            reader.readAsDataURL(file);
        },
        async generatePDF() {
            try {
                console.log('Starting PDF generation...');
                
                if (!window.jspdf) {
                    console.error('jsPDF not loaded');
                    alert('PDF generation failed: Required library not loaded');
                    return;
                }

                console.log('jsPDF available:', window.jspdf);
                console.log('jsPDF constructor:', jsPDF);

                const pageSize = this.invoice.taxType === 'sales' ? [215.9, 279.4] : 'a4';
                console.log('Creating PDF with page size:', pageSize);

                const doc = new jsPDF({
                    unit: 'mm',
                    format: pageSize
                });

                console.log('PDF object created:', doc);
                
                // Add logo if exists
                if (this.logo) {
                    doc.addImage(this.logo, 'JPEG', 20, 10, 40, 25);
                    doc.setFontSize(20);
                    doc.text('INVOICE', 105, 30, { align: 'center' });
                } else {
                    doc.setFontSize(20);
                    doc.text('INVOICE', 105, 20, { align: 'center' });
                }
                
                const yOffset = this.logo ? 10 : 0;
                
                // Add invoice details
                doc.setFontSize(10);
                doc.text(`Invoice Number: ${this.invoice.number}`, 20, 40 + yOffset);
                doc.text(`Date: ${this.invoice.date}`, 20, 45 + yOffset);
                
                // Add sender details
                doc.text('From:', 20, 60 + yOffset);
                doc.text(this.sender.name, 20, 65 + yOffset);
                doc.text(this.sender.address.split('\n'), 20, 70 + yOffset);
                doc.text(`Phone: ${this.sender.phone}`, 20, 85 + yOffset);
                doc.text(`Email: ${this.sender.email}`, 20, 90 + yOffset);
                
                // Add recipient details
                doc.text('To:', 20, 105 + yOffset);
                doc.text(this.recipient.name, 20, 110 + yOffset);
                doc.text(this.recipient.address.split('\n'), 20, 115 + yOffset);
                
                // Add items table
                const tableData = this.invoice.items.map(item => [
                    item.description,
                    item.quantity,
                    item.unitPrice.toFixed(2),
                    this.calculateItemTotal(item)
                ]);
                
                doc.autoTable({
                    startY: 130 + yOffset,
                    head: [['Description', 'Quantity', 'Unit Price', 'Total']],
                    body: tableData,
                });
                
                // Add totals
                const finalY = doc.lastAutoTable.finalY + 10;
                doc.text(`Subtotal: $${this.calculateSubtotal}`, 140, finalY);
                const taxLabel = this.invoice.taxType.toUpperCase();
                doc.text(`${taxLabel} (${this.invoice.taxRate}%): $${this.calculateTaxAmount}`, 140, finalY + 5);
                doc.text(`Total: $${this.calculateTotal}`, 140, finalY + 10);
                
                // Add notes if present
                if (this.invoice.notes) {
                    doc.text('Notes:', 20, finalY + 25);
                    doc.text(this.invoice.notes.split('\n'), 20, finalY + 30);
                }
                
                console.log('Attempting to save PDF...');
                doc.save(`Invoice_${this.invoice.number}.pdf`);
                console.log('PDF saved successfully');

                // Update counter after successful PDF generation
                const response = await fetch(invoiceData.ajaxUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'increment_invoice_counter',
                        nonce: invoiceData.nonce
                    }),
                    credentials: 'include'
                });
                
                const data = await response.json();
                if (data.success) {
                    this.invoiceCount = parseInt(data.data.count);
                }

            } catch (error) {
                console.error('PDF Generation failed:', error);
                alert('Failed to generate PDF. Please check console for details.');
            }
        }
    },
    computed: {
        calculateSubtotal() {
            return this.invoice.items
                .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
                .toFixed(2);
        },
        calculateTaxAmount() {
            return (this.calculateSubtotal * (this.invoice.taxRate / 100)).toFixed(2);
        },
        calculateTotal() {
            return (parseFloat(this.calculateSubtotal) + parseFloat(this.calculateTaxAmount)).toFixed(2);
        }
    },
    async created() {
        try {
            this.invoiceCount = parseInt(invoiceData.currentCount) || 0;
            this.invoice.number = this.generateInvoiceNumber();
            console.log('Initial counter value:', this.invoiceCount);
        } catch (error) {
            console.error('Error initializing counter:', error);
        }
    },
    mounted() {
        if (!this.invoiceCount && invoiceData.currentCount) {
            this.invoiceCount = parseInt(invoiceData.currentCount);
            console.log('Counter initialized in mounted:', this.invoiceCount);
        }
        this.addItem();
    }
}).mount('#app');