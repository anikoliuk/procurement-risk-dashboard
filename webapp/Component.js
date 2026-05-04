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
			var oI18nModel = this.getModel("i18n");
			var oResourceBundleMaybePromise = oI18nModel && oI18nModel.getResourceBundle ? oI18nModel.getResourceBundle() : null;
			var pBundle = Promise.resolve(oResourceBundleMaybePromise).catch(function () {
				return null;
			});

			function textOrDefault(oBundle, sKey, sFallback) {
				if (!oBundle || !oBundle.getText) {
					return sFallback;
				}
				try {
					return oBundle.getText(sKey);
				} catch (e) {
					return sFallback;
				}
			}

			function createAndSetViewModel(oBundle, aOrders) {
				aOrders = aOrders || [];
				var aCountries = supplierRiskService.extractCountriesFromOrders(aOrders);
				var aCountryItems = [{ key: "", text: textOrDefault(oBundle, "countryAll", "All Countries") }].concat(
					aCountries.map(function (c) {
						return { key: c, text: c };
					})
				);

				return new JSONModel({
					orders: aOrders,
					dashboardChartCountry: "",
					dashboardPaymentPerfSort: "lateShareDesc",
					paymentPerfSortItems: [
						{ key: "lateShareDesc", text: textOrDefault(oBundle, "sortPayPerfLateShare", "Late Share (Desc)") },
						{ key: "onTimeDesc", text: textOrDefault(oBundle, "sortPayPerfOnTimeDesc", "On Time (Desc)") },
						{ key: "onTimeAsc", text: textOrDefault(oBundle, "sortPayPerfOnTimeAsc", "On Time (Asc)") },
						{ key: "late03Desc", text: textOrDefault(oBundle, "sortPayPerfLate03", "Late 0-3 d") },
						{ key: "late310Desc", text: textOrDefault(oBundle, "sortPayPerfLate310", "Late 3-10 d") },
						{ key: "late10Desc", text: textOrDefault(oBundle, "sortPayPerfLate10", "Late >10 d") },
						{ key: "supplierAsc", text: textOrDefault(oBundle, "sortPayPerfSupplierAZ", "Supplier A-Z") }
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
						{ key: "", text: textOrDefault(oBundle, "riskAll", "All Risks") },
						{ key: "GREEN", text: textOrDefault(oBundle, "riskGREEN", "Green") },
						{ key: "YELLOW", text: textOrDefault(oBundle, "riskYELLOW", "Yellow") },
						{ key: "RED", text: textOrDefault(oBundle, "riskRED", "Red") }
					],
					delayRangeItems: [
						{ key: "", text: textOrDefault(oBundle, "delayAll", "All Delays") },
						{ key: "0-3", text: textOrDefault(oBundle, "delayR0_3", "0-3 days") },
						{ key: "4-10", text: textOrDefault(oBundle, "delayR4_10", "4-10 days") },
						{ key: "10+", text: textOrDefault(oBundle, "delayR10plus", ">10 days") }
					],
					abmahnungItems: [
						{ key: "", text: textOrDefault(oBundle, "abmahnungAll", "All") },
						{ key: "1", text: "≥ 1" },
						{ key: "2", text: "≥ 2" },
						{ key: "3", text: "≥ 3" }
					]
				});
			}

			Promise.all([
				pBundle,
				supplierRiskService.loadSuppliersFromJson().catch(function () {
					return { orders: [] };
				})
			]).then(function (aResults) {
				var oBundle = aResults[0];
				var oMock = aResults[1] || { orders: [] };
				var oModel = createAndSetViewModel(oBundle, oMock.orders || []);
				oModel.setDefaultBindingMode("TwoWay");
				that.setModel(oModel, "view");

				supplierRiskService.recalculateAll(oModel.getData(), oBundle);
			}).catch(function () {
				var oFallbackModel = createAndSetViewModel(null, []);
				oFallbackModel.setDefaultBindingMode("TwoWay");
				that.setModel(oFallbackModel, "view");
			}).finally(function () {
				that.getRouter().initialize();
			});
		}
	});
});
