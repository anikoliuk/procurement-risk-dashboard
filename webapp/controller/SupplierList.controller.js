sap.ui.define([
	"procurement/risk/dashboard/controller/BaseController",
	"procurement/risk/dashboard/service/supplierRiskService",
	"procurement/risk/dashboard/util/formatter",
	"procurement/risk/dashboard/util/exportUtil"
], function (BaseController, supplierRiskService, Formatter, exportUtil) {
	"use strict";

	return BaseController.extend("procurement.risk.dashboard.controller.SupplierList", {

		formatter: Formatter,

		onInit: function () {
			var oRoute = this.getRouter().getRoute("supplierList");
			oRoute.attachPatternMatched(this._onMatched, this);
		},

		_onMatched: function () {
			this._applyRecalc();
		},

		onNavDashboard: function () {
			this.getRouter().navTo("dashboard");
		},

		onFilterSearch: function () {
			this._applyRecalc();
		},

		onFilterClear: function () {
			this.getModel("view").setProperty("/filterState", {
				search: "",
				country: "",
				riskStatus: "",
				delayRange: "",
				abmahnungMin: ""
			});
			this._applyRecalc();
		},

		onColumnSortPress: function (oEvent) {
			var oSrc = oEvent.getSource();
			var sKey = null;
			oSrc.getCustomData().forEach(function (cd) {
				if (cd.getKey() === "sortKey") {
					sKey = cd.getValue();
				}
			});
			if (!sKey) {
				return;
			}
			var oModel = this.getModel("view");
			var cur = oModel.getProperty("/sortKey");
			var desc = !!oModel.getProperty("/sortDescending");
			if (cur === sKey) {
				oModel.setProperty("/sortDescending", !desc);
			} else {
				oModel.setProperty("/sortKey", sKey);
				oModel.setProperty("/sortDescending", false);
			}
			this._applyRecalc();
		},

		onExportExcel: function () {
			var oBundle = this.getResourceBundle();
			var oModel = this.getModel("view");
			var aRows = oModel.getProperty("/filteredSuppliers") || [];

			var aData = aRows.map(function (s) {
				return {
					supplierName: s.supplierName || "",
					supplierId: s.supplierId || "",
					country: s.country || "",
					totalOrders: s.totalOrders || 0,
					totalAmountEur: s.totalAmount || 0,
					avgDelay: s.averagePaymentDelayDays || 0,
					latePct: s.latePercentage || 0,
					lateOrders: s.lateOrders || 0,
					onTimePct: s.onTimePaymentRate != null ? Math.round(s.onTimePaymentRate * 1000) / 10 : "",
					risk: s.riskStatusText || s.riskStatus || ""
				};
			});

			exportUtil.exportSpreadsheet({
				title: oBundle.getText("hdrSuppliers"),
				fileName: "Supplier_Register.xlsx",
				columns: [
					{ label: oBundle.getText("colName"), property: "supplierName" },
					{ label: oBundle.getText("colIdExport"), property: "supplierId" },
					{ label: oBundle.getText("colCountry"), property: "country" },
					{ label: oBundle.getText("colOrders"), property: "totalOrders", type: "number" },
					{ label: oBundle.getText("colAmount"), property: "totalAmountEur", type: "number" },
					{ label: oBundle.getText("colDelay"), property: "avgDelay", type: "number" },
					{ label: oBundle.getText("colLatePct"), property: "latePct", type: "number" },
					{ label: oBundle.getText("colLate"), property: "lateOrders", type: "number" },
					{ label: oBundle.getText("colOnTime"), property: "onTimePct", type: "number" },
					{ label: oBundle.getText("colRisk"), property: "risk" }
				],
				rows: aData
			});
		},

		onExportPdf: function () {
			var oBundle = this.getResourceBundle();
			var oModel = this.getModel("view");
			var aRows = oModel.getProperty("/filteredSuppliers") || [];

			var aData = aRows.map(function (s) {
				return {
					supplierName: s.supplierName || "",
					supplierId: s.supplierId || "",
					country: s.country || "",
					totalOrders: s.totalOrders != null ? String(s.totalOrders) : "",
					totalAmount: s.totalAmount != null ? String(s.totalAmount) : "",
					avgDelay: s.averagePaymentDelayDays != null ? String(s.averagePaymentDelayDays) : "",
					latePct: s.latePercentage != null ? String(Math.round(s.latePercentage * 10) / 10) + "%" : "",
					lateOrders: s.lateOrders != null ? String(s.lateOrders) : "",
					onTimePct: s.onTimePaymentRate != null ? String(Math.round(s.onTimePaymentRate * 1000) / 10) + "%" : "",
					risk: s.riskStatusText || s.riskStatus || ""
				};
			});

			exportUtil.exportPdfTable({
				title: oBundle.getText("hdrSuppliers"),
				columns: [
					{ label: oBundle.getText("colName"), property: "supplierName" },
					{ label: oBundle.getText("colIdExport"), property: "supplierId" },
					{ label: oBundle.getText("colCountry"), property: "country" },
					{ label: oBundle.getText("colOrders"), property: "totalOrders" },
					{ label: oBundle.getText("colAmountRaw"), property: "totalAmount" },
					{ label: oBundle.getText("colDelay"), property: "avgDelay" },
					{ label: oBundle.getText("colLatePct"), property: "latePct" },
					{ label: oBundle.getText("colLate"), property: "lateOrders" },
					{ label: oBundle.getText("colOnTime"), property: "onTimePct" },
					{ label: oBundle.getText("colRisk"), property: "risk" }
				],
				rows: aData
			});
		},

		onItemPress: function (oEvent) {
			var oItem = oEvent.getParameter("listItem");
			var oCtx = oItem && oItem.getBindingContext("view");
			if (!oCtx) {
				return;
			}
			var oData = oCtx.getObject();
			this.getRouter().navTo("supplierDetail", {
				supplierId: oData.supplierId
			});
		},

		_applyRecalc: function () {
			var oModel = this.getModel("view");
			if (!oModel) {
				return;
			}
			oModel.setProperty("/ui/busyKpi", true);
			oModel.setProperty("/ui/busyCharts", true);
			var that = this;
			window.setTimeout(function () {
				supplierRiskService.recalculateAll(oModel.getData(), that.getResourceBundle());
				oModel.refresh(true);
				oModel.setProperty("/ui/busyKpi", false);
				oModel.setProperty("/ui/busyCharts", false);
			}, 30);
		}
	});
});
