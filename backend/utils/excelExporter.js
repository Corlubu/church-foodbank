// backend/utils/excelExporter.js
const ExcelJS = require('exceljs');
const { Readable } = require('stream');

/**
 * Generate an Excel report from citizen data
 * @param {Array<Object>} rows - Array of citizen objects from the DB
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
    { header: 'Distribution Window Start', key: 'window_start', width: 25 },
    { header: 'Distribution Window End', key: 'window_end', width: 25 },
    { header: 'Pickup Confirmed', key: 'pickup_confirmed', width: 18 }
  ];

  // Add rows
  if (rows.length > 0) {
    // Process rows for correct formatting
    const formattedRows = rows.map(row => ({
      ...row,
      submitted_at: row.submitted_at ? new Date(row.submitted_at) : null,
      window_start: row.window_start ? new Date(row.window_start) : null,
      window_end: row.window_end ? new Date(row.window_end) : null,
      pickup_confirmed: row.pickup_confirmed ? 'Yes' : 'No'
    }));

    worksheet.addRows(formattedRows);

    // Format date columns
    ['submitted_at', 'window_start', 'window_end'].forEach(colKey => {
      const col = worksheet.getColumn(colKey);
      col.numFmt = 'YYYY-MM-DD HH:MM';
    });

  } else {
    worksheet.addRow({ name: 'No data available' });
  }

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
