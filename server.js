const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/generate-pdf', (req, res) => {
    const { type, installation, capacity, priceCategory, price } = req.body;

    // Create a document
    const doc = new PDFDocument();
    const fileName = `quotation_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, fileName);

    doc.pipe(fs.createWriteStream(filePath));

    // Add content to the PDF
    doc.fontSize(25).text('Solar Solution Quotation', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Type: ${type}`);
    doc.text(`Installation: ${installation}`);
    doc.text(`Capacity: ${capacity}`);
    doc.text(`Price Category: ${priceCategory}`);
    doc.text(`Price: ${price}`);
    
    doc.end();

    res.json({ fileName });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
