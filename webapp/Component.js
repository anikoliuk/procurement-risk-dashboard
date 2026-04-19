sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"procurement/risk/dashboard/service/supplierRiskService"
], function (UIComponent, Device, JSONModel, supplierRiskService) {
	"use strict";

	return UIComponent.extend("procurement.risk.dashboard.Component", {
		metadata: {
			manifest: "json"
		},

		init: function () {
			UIComponent.prototype.init.apply(this, arguments);

			var oDeviceModel = new JSONModel(Device);
			oDeviceModel.setDefaultBindingMode("OneWay");
			this.setModel(oDeviceModel, "device");

			var that = this;
			var oBundle = this.getModel("i18n").getResourceBundle();

			supplierRiskService.loadSuppliersFromJson().then(function (oMock) {
				var aOrders = oMock.orders || [];
				var aCountries = supplierRiskService.extractCountriesFromOrders(aOrders);
				var aCountryItems = [{ key: "", text: oBundle.getText("countryAll") }].concat(
					aCountries.map(function (c) {
						return { key: c, text: c };
					})
				);

				var oModel = new JSONModel({
					orders: aOrders,
					dashboardChartCountry: "",
					dashboardPaymentPerfSort: "lateShareDesc",
					paymentPerfSortItems: [
						{ key: "lateShareDesc", text: oBundle.getText("sortPayPerfLateShare") },
						{ key: "onTimeDesc", text: oBundle.getText("sortPayPerfOnTimeDesc") },
						{ key: "onTimeAsc", text: oBundle.getText("sortPayPerfOnTimeAsc") },
						{ key: "late03Desc", text: oBundle.getText("sortPayPerfLate03") },
						{ key: "late310Desc", text: oBundle.getText("sortPayPerfLate310") },
						{ key: "late10Desc", text: oBundle.getText("sortPayPerfLate10") },
						{ key: "supplierAsc", text: oBundle.getText("sortPayPerfSupplierAZ") }
					],
					selectedSupplier: {},
					suppliers: [],
					filteredSuppliers: [],
					kpi: {},
					charts: {
						riskPie: [],
						ordersRiskPie: [],
						revenueRiskPie: [],
						ordersStacked: [],
						ordersStackedFull: [],
						ordersStackedDisplayCount: 0,
						ordersStackedTotalCount: 0,
						volatilityBubbles: [],
						latePctByCountry: [],
						avgDelayBySupplier: [],
						scatterVolumeDelay: []
					},
					filterState: {
						search: "",
						country: "",
						riskStatus: "",
						delayRange: "",
						abmahnungMin: ""
					},
					sortKey: "supplierName",
					sortDescending: false,
					ui: {
						busyKpi: false,
						busyCharts: false
					},
					countries: aCountries,
					countryItems: aCountryItems,
					riskItems: [
						{ key: "", text: oBundle.getText("riskAll") },
						{ key: "GREEN", text: oBundle.getText("riskGREEN") },
						{ key: "YELLOW", text: oBundle.getText("riskYELLOW") },
						{ key: "RED", text: oBundle.getText("riskRED") }
					],
					delayRangeItems: [
						{ key: "", text: oBundle.getText("delayAll") },
						{ key: "0-3", text: oBundle.getText("delayR0_3") },
						{ key: "4-10", text: oBundle.getText("delayR4_10") },
						{ key: "10+", text: oBundle.getText("delayR10plus") }
					],
					abmahnungItems: [
						{ key: "", text: oBundle.getText("abmahnungAll") },
						{ key: "1", text: "≥ 1" },
						{ key: "2", text: "≥ 2" },
						{ key: "3", text: "≥ 3" }
					]
				});

				oModel.setDefaultBindingMode("TwoWay");
				that.setModel(oModel, "view");

				supplierRiskService.recalculateAll(oModel.getData(), oBundle);

				that.getRouter().initialize();
			});
		}
	});
});
