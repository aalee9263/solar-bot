const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Generate PDF Endpoint
app.post('/generate-pdf', (req, res) => {
    const { type, installation, capacity, priceCategory, price } = req.body;

    const doc = new PDFDocument();
    const public = `quotation_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, public);

    doc.pipe(fs.createWriteStream(filePath).on('finish', () => {
        const fileBuffer = fs.readFileSync(filePath);
        const fileBase64 = fileBuffer.toString('base64');

        res.json({ fileBase64 });
    }));

    doc.fontSize(25).text('Solar Solution Quotation', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Type: ${type}`);
    doc.text(`Installation: ${installation}`);
    doc.text(`Capacity: ${capacity}`);
    doc.text(`Price Category: ${priceCategory}`);
    doc.text(`Price: ${price}`);

    doc.end();
});

// Webhook Endpoint
app.post('/webhook', (req, res) => {
    const parameters = req.body.sessionInfo.parameters;

    // Log the received parameters for debugging
    console.log('Received parameters:', parameters);

    const pdfPayload = {
        type: parameters.type,
        installation: parameters.installation,
        capacity: parameters.capacity,
        priceCategory: parameters.priceCategory,
        price: calculatePrice(parameters)
    };

    axios.post('http://localhost:3000/generate-pdf', pdfPayload)
        .then(response => {
            const fileBase64 = response.data.fileBase64;
            res.json({
                fulfillment_response: {
                    messages: [
                        {
                            payload: {
                                type: 'file',
                                url: `data:application/pdf;base64,${fileBase64}`,
                                displayName: 'Quotation.pdf',
                                title: 'Download your quotation'
                            }
                        }
                    ]
                }
            });
        })
        .catch(error => {
            console.error('Error generating PDF:', error);
            res.json({
                fulfillment_response: {
                    messages: [
                        {
                            text: {
                                text: [
                                    'Failed to generate PDF. Please try again.'
                                ]
                            }
                        }
                    ]
                }
            });
        });
});

function calculatePrice(parameters) {
    let basePrice = 1000;
    let multiplier = 1;

    if (parameters.priceCategory === 'Premium') {
        multiplier = 1.5;
    } else if (parameters.priceCategory === 'Standard') {
        multiplier = 1.2;
    }

    return basePrice * multiplier;
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
