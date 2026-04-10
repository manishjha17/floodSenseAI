const PDFDocument = require('pdfkit');

exports.generateReport = (req, res) => {
    const { address, prediction, confidence, text_report } = req.body;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=flood_damage_report.pdf');

    doc.pipe(res);

    // --- Header ---
    doc.save();
    doc.translate(50, 48); // Position
    doc.scale(1.5); // Make it slightly larger
    doc.path('M13 10V3L4 14h7v7l9-11h-7z')
        .lineWidth(2.5)
        .lineCap('round')
        .lineJoin('round')
        .strokeColor('#06b6d4') // cyan-500
        .stroke();
    doc.restore();

    doc.fillColor('#4f46e5') // Indigo-600
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('FloodSense AI', 95, 50, { align: 'left' });

    doc.fillColor('#6b7280') // Gray-500
        .fontSize(10)
        .font('Helvetica')
        .text('Automated Damage Assessment System', 85, 80, { align: 'left' })
        .moveDown(2);

    // --- Report Metadata ---
    const reportId = 'FS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const date = new Date().toLocaleString();

    doc.fontSize(16)
        .fillColor('#111827') // Gray-900
        .font('Helvetica-Bold')
        .text('Official Damage Assessment Report', { align: 'center', underline: true })
        .moveDown(2);

    doc.fontSize(10)
        .font('Helvetica')
        .text(`Report ID: ${reportId}`, { align: 'right' })
        .text(`Generated On: ${date}`, { align: 'right' })
        .moveDown(2);

    // --- Property Information Section ---
    doc.rect(50, doc.y, 495, 20).fill('#f3f4f6'); // Light gray background
    doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold').text('PROPERTY INFORMATION', 55, doc.y + 5);
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text('Evaluated Address: ', 50, doc.y, { continued: true })
        .font('Helvetica').text(address || 'N/A');
    doc.moveDown(2);

    // --- AI Assessment Results Section ---
    doc.rect(50, doc.y, 495, 20).fill('#f3f4f6');
    doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold').text('AI ANALYSIS RESULTS', 55, doc.y + 5);
    doc.moveDown(1.5);

    // Color code the prediction
    let predColor = '#10b981'; // Green for No/Low
    if (prediction && prediction.toLowerCase().includes('medium')) predColor = '#f59e0b'; // Amber
    if (prediction && prediction.toLowerCase().includes('destroy')) predColor = '#ef4444'; // Red

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text('Damage Classification: ', 50, doc.y, { continued: true })
        .fillColor(predColor).text((prediction || 'Unknown').toUpperCase());

    doc.moveDown(0.5);

    const confVal = confidence ? (parseFloat(confidence) * 100).toFixed(1) + '%' : 'N/A';
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151').text('Model Confidence Level: ', 50, doc.y, { continued: true })
        .font('Helvetica').text(confVal);
    doc.moveDown(2);

    // --- Detailed Observations Section ---
    doc.rect(50, doc.y, 495, 20).fill('#f3f4f6');
    doc.fillColor('#1f2937').fontSize(12).font('Helvetica-Bold').text('DETAILED OBSERVATIONS', 55, doc.y + 5);
    doc.moveDown(1.5);

    doc.fontSize(10).font('Helvetica').fillColor('#4b5563').text(text_report || 'No detailed observations provided by the user.', {
        width: 495,
        align: 'justify'
    });

    doc.moveDown(4);

    const bottomY = doc.page.height - 100;

    // --- Official Stamp ---
    doc.save();
    doc.translate(450, bottomY - 50);

    const centerX = 0;
    const centerY = 0;
    const radius = 35;

    // Outer circle
    doc.circle(centerX, centerY, radius).lineWidth(2).strokeColor('#dc2626').stroke();
    // Inner circle
    doc.circle(centerX, centerY, radius - 4).lineWidth(1).strokeColor('#dc2626').stroke();

    // "VERIFIED" text in the center
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#dc2626').text('VERIFIED', centerX - radius, centerY - 5, {
        width: radius * 2,
        align: 'center'
    });

    // Add some text around the edge
    doc.fontSize(6).font('Helvetica').fillColor('#dc2626')
        .text('FLOODSENSE AI', centerX - 35, centerY - 20, { width: 70, align: 'center' })
        .text('SYSTEM', centerX - 35, centerY + 15, { width: 70, align: 'center' });

    doc.restore();

    // --- Footer & Disclaimer ---
    doc.moveTo(50, bottomY).lineTo(545, bottomY).strokeColor('#d1d5db').stroke();

    doc.fontSize(8).fillColor('#9ca3af').font('Helvetica-Oblique').text(
        'DISCLAIMER: This report is generated automatically by the FloodSense AI system based on visual and textual inputs provided by the user. It is highly recommended to verify these findings with an official structural engineer or emergency responder before filing permanent claims for catastrophic damages.',
        50, bottomY + 15, { width: 495, align: 'center' }
    );

    // Finalize PDF file
    doc.end();
};
