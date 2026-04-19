sap.ui.define([
	"procurement/risk/dashboard/controller/BaseController",
	"sap/m/MessageBox",
	"procurement/risk/dashboard/util/formatter",
	"procurement/risk/dashboard/service/supplierRiskService",
	"procurement/risk/dashboard/util/exportUtil"
], function (BaseController, MessageBox, Formatter, supplierRiskService, exportUtil) {
	"use strict";

	return BaseController.extend("procurement.risk.dashboard.controller.SupplierDetail", {

		formatter: Formatter,

		onInit: function () {
			var oRoute = this.getRouter().getRoute("supplierDetail");
			oRoute.attachPatternMatched(this._onMatched, this);
		},

		_onMatched: function (oEvent) {
			var oArgs = oEvent.getParameter("arguments") || {};
			var sId = decodeURIComponent(oArgs.supplierId || "");
			var oModel = this.getModel("view");
			var aSuppliers = oModel.getProperty("/suppliers") || [];
			var oSupplier = aSuppliers.filter(function (s) {
				return s.supplierId === sId;
			})[0];

			if (!oSupplier) {
				MessageBox.error(this.getResourceBundle().getText("msgNoSupplier"));
				this.getRouter().navTo("supplierList");
				return;
			}

			supplierRiskService.enrichSupplier(oSupplier, this.getResourceBundle());
			oModel.setProperty("/selectedSupplier", oSupplier);
			oModel.refresh(true);
		},

		onNavSuppliers: function () {
			this.getRouter().navTo("supplierList");
		},

		formatOrderLateStatusText: function (isLate) {
			var oBundle = this.getResourceBundle();
			return isLate ? oBundle.getText("statusLate") : oBundle.getText("statusOnTime");
		},

		onExportOrdersExcel: function () {
			var oBundle = this.getResourceBundle();
			var sup = this.getModel("view").getProperty("/selectedSupplier");
			var orders = (sup && sup.orders) ? sup.orders : [];
			var fmt = this.formatter;

			var rows = orders.map(function (o) {
				return {
					orderId: o.orderId || "",
					amount: o.amount || 0,
					dueDate: fmt.formatShortDate(o.dueDate),
					paymentDate: fmt.formatShortDate(o.paymentDate),
					delayDays: o.delayDays != null ? o.delayDays : "",
					status: o.isLate ? oBundle.getText("statusLate") : oBundle.getText("statusOnTime")
				};
			});

			exportUtil.exportSpreadsheet({
				title: (sup && sup.supplierName) || "Orders",
				fileName: "Supplier_Orders_" + (sup && sup.supplierId ? sup.supplierId : "export") + ".xlsx",
				columns: [
					{ label: oBundle.getText("colOrderId"), property: "orderId" },
					{ label: oBundle.getText("colAmount"), property: "amount", type: "number" },
					{ label: oBundle.getText("colDueDate"), property: "dueDate" },
					{ label: oBundle.getText("colPayDate"), property: "paymentDate" },
					{ label: oBundle.getText("colDelayDays"), property: "delayDays", type: "number" },
					{ label: oBundle.getText("colStatus"), property: "status" }
				],
				rows: rows
			});
		},

		onExportOrdersPdf: function () {
			var oBundle = this.getResourceBundle();
			var sup = this.getModel("view").getProperty("/selectedSupplier");
			var orders = (sup && sup.orders) ? sup.orders : [];
			var fmt = this.formatter;

			var rows = orders.map(function (o) {
				return {
					orderId: o.orderId || "",
					amount: o.amount != null ? String(o.amount) : "",
					dueDate: fmt.formatShortDate(o.dueDate),
					paymentDate: fmt.formatShortDate(o.paymentDate),
					delayDays: o.delayDays != null ? String(o.delayDays) : "",
					status: o.isLate ? oBundle.getText("statusLate") : oBundle.getText("statusOnTime")
				};
			});

			exportUtil.exportPdfTable({
				title: oBundle.getText("detailOrdersTitle") + " — " + ((sup && sup.supplierName) || ""),
				columns: [
					{ label: oBundle.getText("colOrderId"), property: "orderId" },
					{ label: oBundle.getText("colAmountRaw"), property: "amount" },
					{ label: oBundle.getText("colDueDate"), property: "dueDate" },
					{ label: oBundle.getText("colPayDate"), property: "paymentDate" },
					{ label: oBundle.getText("colDelayDays"), property: "delayDays" },
					{ label: oBundle.getText("colStatus"), property: "status" }
				],
				rows: rows
			});
		}
	});
});
