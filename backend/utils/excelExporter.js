// backend/utils/excelExporter.js
const ExcelJS = require('exceljs');
const { Readable } = require('stream');

/**
 * Generate an Excel report from citizen data
 * @param {Array<Object>} rows - Array of citizen objects
 * @param {string} sheetName - Name of the worksheet
 * @returns {Promise<Buffer>} - Excel file as buffer
 */
async function generateCitizenReport(rows, sheetName = 'Food Bank Registrations') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Define columns (matches your SELECT in admin.js)
  worksheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Order Number', key: 'order_number', width: 20 },
    { header: 'Submission Date', key: 'submitted_at', width: 22 },
    { header: 'Distribution Window', key: 'window_start', width: 22 },
    { header: 'Pickup Confirmed', key: 'pickup_confirmed', width: 18 }
  ];

  // Add rows
  if (rows.length > 0) {
    worksheet.addRows(rows);

    // Format date columns
    const dateColumns = ['submitted_at', 'window_start'];
    rows.forEach((row, rowIndex) => {
      dateColumns.forEach(col => {
        const cell = worksheet.getCell(rowIndex + 2, worksheet.getColumn(col).number);
        if (row[col]) {
          cell.value = new Date(row[col]);
          cell.numFmt = 'YYYY-MM-DD HH:MM';
        }
      });
    });

    // Format boolean column
    const boolCol = worksheet.getColumn('pickup_confirmed');
    boolCol.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.value = cell.value ? 'Yes' : 'No';
      }
    });
  } else {
    worksheet.addRow({ name: 'No data available', phone: '', email: '', order_number: '', submitted_at: '', window_start: '', pickup_confirmed: '' });
  }

  // Auto-fit columns (optional, adds slight overhead)
  worksheet.columns.forEach(column => {
    let maxLength = column.header.length;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? cell.value.toString().length : 0;
      if (cellLength > maxLength) maxLength = cellLength;
    });
    column.width = Math.min(maxLength + 2, 50); // Cap at 50
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Stream Excel file to Express response
 * @param {Express.Response} res - Express response object
 * @param {Buffer} excelBuffer - Generated Excel buffer
 * @param {string} filename - Desired filename (without .xlsx)
 */
function streamExcelResponse(res, excelBuffer, filename = 'report') {
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safeFilename = `${filename}_${timestamp}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeFilename}"`
  );
  res.setHeader('Content-Length', excelBuffer.length);

  // Stream the buffer
  const stream = Readable.from(excelBuffer);
  stream.pipe(res);
}

module.exports = {
  generateCitizenReport,
  streamExcelResponse
};