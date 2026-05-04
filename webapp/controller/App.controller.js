sap.ui.define([
	"procurement/risk/dashboard/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("procurement.risk.dashboard.controller.App", {
		_oBundle: null,

		onInit: function () {
			var oRouter = this.getRouter();
			oRouter.attachRouteMatched(this._onRouteMatched, this);

			var oI18nModel = this.getOwnerComponent().getModel("i18n");
			if (oI18nModel && oI18nModel.getResourceBundle) {
				Promise.resolve(oI18nModel.getResourceBundle()).then(function (oBundle) {
					this._oBundle = oBundle;
				}.bind(this)).catch(function () {
					this._oBundle = null;
				}.bind(this));
			}
		},

		_onRouteMatched: function (oEvent) {
			var sName = oEvent.getParameter("name");
			var sPrefix = "";
			var oBundle = this._oBundle;

			if (oBundle && oBundle.getText) {
				try {
					if (sName === "dashboard") {
						sPrefix = oBundle.getText("targetDashboardTitle");
					} else if (sName === "supplierList") {
						sPrefix = oBundle.getText("targetSupplierListTitle");
					} else if (sName === "supplierDetail") {
						sPrefix = oBundle.getText("targetSupplierDetailTitle");
					}
				} catch (e) {
					sPrefix = "";
				}
			}

			if (sPrefix) {
				document.title = sPrefix + " · Procurement Risk";
			} else if (sName === "dashboard") {
				document.title = "Dashboard · Procurement Risk";
			} else if (sName === "supplierList") {
				document.title = "Suppliers · Procurement Risk";
			} else if (sName === "supplierDetail") {
				document.title = "Supplier Detail · Procurement Risk";
			}
		}
	});
});
