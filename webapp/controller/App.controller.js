sap.ui.define([
	"procurement/risk/dashboard/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("procurement.risk.dashboard.controller.App", {

		onInit: function () {
			var oRouter = this.getRouter();
			oRouter.attachRouteMatched(this._onRouteMatched, this);
		},

		_onRouteMatched: function (oEvent) {
			var sName = oEvent.getParameter("name");
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			var sPrefix = "";

			if (sName === "dashboard") {
				sPrefix = oBundle.getText("targetDashboardTitle");
			} else if (sName === "supplierList") {
				sPrefix = oBundle.getText("targetSupplierListTitle");
			} else if (sName === "supplierDetail") {
				sPrefix = oBundle.getText("targetSupplierDetailTitle");
			}

			if (sPrefix) {
				document.title = sPrefix + " · Procurement Risk";
			}
		}
	});
});
