sap.ui.define([
	"sap/ui/export/Spreadsheet",
	"sap/ui/core/util/File"
], function (Spreadsheet, File) {
	"use strict";

	function escapeHtml(s) {
		return String(s)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	function exportSpreadsheet(mSettings) {
		var aCols = mSettings.columns.map(function (c) {
			return {
				label: c.label,
				property: c.property,
				type: c.type || "string",
				width: c.width || ""
			};
		});

		var oSheet = new Spreadsheet({
			workbook: {
				columns: aCols,
				context: {
					title: mSettings.title || "Export"
				}
			},
			dataSource: mSettings.rows,
			fileName: mSettings.fileName || "export.xlsx"
		});

		oSheet.build().then(function () {
			oSheet.destroy();
		}).catch(function () {
			oSheet.destroy();
		});
	}

	function exportPdfTable(mSettings) {
		var title = escapeHtml(mSettings.title || "Export");
		var cols = mSettings.columns;
		var rows = mSettings.rows;

		var html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>" + title + "</title>";
		html += "<style>body{font-family:Arial,Helvetica,sans-serif;padding:16px;color:#333}";
		html += "h2{font-size:16px;margin:0 0 12px}";
		html += "table{border-collapse:collapse;width:100%;font-size:11px}";
		html += "th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}";
		html += "th{background:#f5f5f5;font-weight:600}</style></head><body>";
		html += "<h2>" + title + "</h2><table><thead><tr>";
		cols.forEach(function (c) {
			html += "<th>" + escapeHtml(c.label) + "</th>";
		});
		html += "</tr></thead><tbody>";
		rows.forEach(function (row) {
			html += "<tr>";
			cols.forEach(function (c) {
				var v = row[c.property];
				if (v === undefined || v === null) {
					v = "";
				}
				html += "<td>" + escapeHtml(String(v)) + "</td>";
			});
			html += "</tr>";
		});
		html += "</tbody></table></body></html>";

		var w = window.open("", "_blank");
		if (w) {
			w.document.open();
			w.document.write(html);
			w.document.close();
			w.focus();
			window.setTimeout(function () {
				w.print();
			}, 250);
		}
	}

	return {
		exportSpreadsheet: exportSpreadsheet,
		exportPdfTable: exportPdfTable
	};
});
