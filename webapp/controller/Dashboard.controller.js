sap.ui.define([
	"procurement/risk/dashboard/controller/BaseController",
	"procurement/risk/dashboard/service/supplierRiskService",
	"procurement/risk/dashboard/util/formatter",
	"sap/viz/ui5/data/FlattenedDataset",
	"sap/viz/ui5/controls/common/feeds/FeedItem",
	"sap/m/ResponsivePopover",
	"sap/m/VBox",
	"sap/m/Label",
	"sap/m/Button"
], function (BaseController, supplierRiskService, Formatter, FlattenedDataset, FeedItem, ResponsivePopover, VBox, Label, Button) {
	"use strict";

	var _axisNoTruncate = {
		title: { visible: false },
		label: {
			visible: true,
			rotation: -40,
			skippingStrategy: "none",
			hideFractionEmptyTick: false,
			truncateLabel: false,
			maxWidth: 480,
			style: {
				fontSize: "11px"
			}
		},
		layout: {
			maxHeight: "35%"
		}
	};

	var _plotHover = {
		animation: { dataChange: false },
		dataLabel: { visible: true, formatString: "", hideWhenOverlap: false },
		gridline: { visible: true }
	};

	var _axisBarCategory = {
		title: { visible: false },
		label: {
			visible: true,
			rotation: 0,
			skippingStrategy: "none",
			hideFractionEmptyTick: false,
			truncateLabel: false,
			maxWidth: 560,
			style: {
				fontSize: "11px"
			}
		},
		layout: {
			maxWidth: "42%"
		}
	};

	var _axisCountryCategory = {
		title: { visible: false },
		label: {
			visible: true,
			rotation: 0,
			skippingStrategy: "none",
			hideFractionEmptyTick: false,
			truncateLabel: false,
			style: {
				fontSize: "11px"
			}
		}
	};

	var _axisBarValue = {
		title: { visible: false },
		label: {
			truncateLabel: false,
			style: {
				fontSize: "11px"
			}
		}
	};

	return BaseController.extend("procurement.risk.dashboard.controller.Dashboard", {

		formatter: Object.assign({}, Formatter),

		onInit: function () {
			var oRoute = this.getRouter().getRoute("dashboard");
			oRoute.attachPatternMatched(this._onMatched, this);
		},

		onExit: function () {
			if (this._oBubblePopover) {
				this._oBubblePopover.destroy();
				this._oBubblePopover = null;
				this._oVBoxBubble = null;
			}
		},

		_onMatched: function () {
			this._refreshAll();
		},

		_resolveVolatilityBubbleCtx: function (oCtx) {
			if (!oCtx) {
				return null;
			}
			var sid = oCtx.supplierId || oCtx.SupplierId;
			var name = oCtx.supplier || oCtx.Supplier;
			if (sid) {
				return oCtx;
			}
			if (!name) {
				return null;
			}
			var oModel = this.getModel("view");
			var arr = oModel && oModel.getProperty("/charts/volatilityBubbles");
			if (!arr || !arr.length) {
				return oCtx;
			}
			var hit = arr.filter(function (r) {
				return r.supplier === name;
			})[0];
			return hit || oCtx;
		},

		_openVolatilityBubblePopover: function (oCtx) {
			var ctx = this._resolveVolatilityBubbleCtx(oCtx);
			if (!ctx || !ctx.supplier) {
				return;
			}
			var oRb = this.getResourceBundle();
			var oView = this.getView();
			if (!this._oVBoxBubble) {
				this._oVBoxBubble = new VBox({
					width: "100%",
					class: "sapUiTinyMarginBegin sapUiTinyMarginEnd sapUiSmallMarginBottom"
				});
				this._oBubblePopover = new ResponsivePopover({
					placement: sap.m.PlacementType.VerticalPreferredBottom,
					showHeader: true,
					contentWidth: "18rem",
					verticalScrolling: true,
					content: this._oVBoxBubble
				});
				oView.addDependent(this._oBubblePopover);
			}

			this._oVBoxBubble.removeAllItems();
			this._oBubblePopover.setTitle(ctx.supplier);

			var fmt = this.formatter;
			var revTxt = fmt && fmt.formatCurrencyEUR ? fmt.formatCurrencyEUR(ctx.revenue) : String(ctx.revenue != null ? ctx.revenue : "");
			var delayTxt = fmt && fmt.formatAvgDelayDays ? fmt.formatAvgDelayDays(ctx.avgDelayDays) : String(ctx.avgDelayDays != null ? ctx.avgDelayDays : "");

			this._oVBoxBubble.addItem(new Label({
				text: oRb.getText("bubbleMeasureOrders") + ": " + (ctx.orderCount != null ? ctx.orderCount : ""),
				wrapping: true,
				class: "sapUiTinyMarginBottom"
			}));
			this._oVBoxBubble.addItem(new Label({
				text: oRb.getText("bubbleMeasureRevenue") + ": " + revTxt,
				wrapping: true,
				class: "sapUiTinyMarginBottom"
			}));
			this._oVBoxBubble.addItem(new Label({
				text: oRb.getText("bubbleMeasureAvgDelay") + ": " + delayTxt + " d",
				wrapping: true,
				class: "sapUiTinyMarginBottom"
			}));

			var rs = ctx.riskStatus;
			if (rs) {
				var riskDisplay = rs;
				try {
					riskDisplay = oRb.getText("risk" + rs);
				} catch (e) {}
				this._oVBoxBubble.addItem(new Label({
					text: oRb.getText("bubblePopoverRisk") + ": " + riskDisplay,
					wrapping: true,
					class: "sapUiTinyMarginBottom"
				}));
			}

			var sSid = ctx.supplierId;
			this._oVBoxBubble.addItem(new Button({
				text: oRb.getText("bubbleOpenProfile"),
				type: "Emphasized",
				enabled: !!sSid,
				class: "sapUiSmallMarginTop",
				press: function () {
					this._oBubblePopover.close();
					if (sSid) {
						this.getRouter().navTo("supplierDetail", {
							supplierId: sSid
						});
					}
				}.bind(this)
			}));

			var oAnchor = this.byId("vizVolatilityBubble");
			if (oAnchor) {
				this._oBubblePopover.openBy(oAnchor);
			}
		},

		_onVolatilityBubbleSelect: function (oEvent) {
			var raw = oEvent.getParameter("data") || oEvent.getParameter("dataList") || [];
			var row = raw[0];
			var ctx = row && (row.data || row);
			this._openVolatilityBubblePopover(ctx);
		},

		_onVolatilityBubbleDeselect: function () {
			if (this._oBubblePopover && this._oBubblePopover.isOpen()) {
				this._oBubblePopover.close();
			}
		},

		onNavToSuppliers: function () {
			this.getRouter().navTo("supplierList");
		},

		onPaymentPerfSortChange: function (oEvent) {
			var oSel = oEvent.getSource();
			var sKey = oSel && oSel.getSelectedKey && oSel.getSelectedKey();
			if (!sKey && oEvent.getParameter) {
				var oItem = oEvent.getParameter("selectedItem");
				sKey = oItem && oItem.getKey && oItem.getKey();
			}
			if (!sKey) {
				return;
			}
			var oModel = this.getModel("view");
			oModel.setProperty("/dashboardPaymentPerfSort", sKey);
			var that = this;
			window.setTimeout(function () {
				supplierRiskService.recalculateDashboardOnly(oModel.getData(), that.getResourceBundle());
				oModel.refresh(true);
				that._bindCharts();
			}, 0);
		},

		_refreshAll: function () {
			var oModel = this.getModel("view");
			if (!oModel) {
				return;
			}

			oModel.setProperty("/ui/busyKpi", true);
			oModel.setProperty("/ui/busyCharts", true);

			var that = this;
			window.setTimeout(function () {
				supplierRiskService.recalculateDashboardOnly(oModel.getData(), that.getResourceBundle());
				oModel.refresh(true);
				oModel.setProperty("/ui/busyKpi", false);
				oModel.setProperty("/ui/busyCharts", false);
				that._bindCharts();
			}, 40);
		},

		_safeDestroyFeeds: function (oViz) {
			try {
				oViz.destroyFeeds();
			} catch (e) {
				while (oViz.getFeeds() && oViz.getFeeds().length) {
					oViz.removeFeed(oViz.getFeeds()[0]);
				}
			}
		},

		_safeDestroyDataset: function (oViz) {
			try {
				var d = oViz.getDataset();
				if (d) {
					d.destroy();
				}
			} catch (e) {
				oViz.destroyDataset();
			}
		},

		_prepViz: function (oViz, oModel) {
			if (typeof oViz.setUiConfig === "function") {
				oViz.setUiConfig({ applicationSet: "fiori" });
			}
			oViz.setModel(oModel, "view");
			oViz.setVizProperties({
				title: {
					visible: false,
					text: ""
				},
				interaction: {
					hover: { enableMouseOverLine: true },
					selectability: { mode: "POINT" }
				},
				tooltip: {
					visible: true
				},
				legend: {
					hoverline: { visible: true },
					hoverShadow: { visible: true },
					label: { truncateLabel: false }
				},
				general: {
					layout: { excludeDimension: [] }
				}
			});
		},

		/** Plot defaults for country chart — avoid dataPointStyle rules here (stacked bar / selection styling can break viz internals). */
		_countryBarPlotArea: function () {
			return {
				animation: _plotHover.animation,
				dataLabel: _plotHover.dataLabel,
				gridline: _plotHover.gridline
			};
		},

		_onCountryChartSelect: function (oEvent) {
			var raw = oEvent.getParameter("data") || oEvent.getParameter("dataList") || [];
			var row = raw[0];
			var ctx = row && (row.data || row);
			var country = ctx && (ctx.country || ctx.Country);
			if (!country) {
				return;
			}
			var oModel = this.getModel("view");
			var cur = oModel.getProperty("/dashboardChartCountry") || "";
			oModel.setProperty("/dashboardChartCountry", cur === country ? "" : country);
			var that = this;
			window.setTimeout(function () {
				supplierRiskService.recalculateDashboardOnly(oModel.getData(), that.getResourceBundle());
				oModel.refresh(true);
				that._bindCharts();
			}, 0);
		},

		_onCountryChartDeselect: function () {
			var oModel = this.getModel("view");
			if (!oModel.getProperty("/dashboardChartCountry")) {
				return;
			}
			oModel.setProperty("/dashboardChartCountry", "");
			var that = this;
			window.setTimeout(function () {
				supplierRiskService.recalculateDashboardOnly(oModel.getData(), that.getResourceBundle());
				oModel.refresh(true);
				that._bindCharts();
			}, 0);
		},

		_onAvgDelayChartSelect: function (oEvent) {
			var raw = oEvent.getParameter("data") || oEvent.getParameter("dataList") || [];
			var row = raw[0];
			var ctx = row && (row.data || row);
			if (!ctx) {
				return;
			}
			var sid = ctx.supplierId || ctx.SupplierId;
			var nm = ctx.supplier || ctx.Supplier;
			if (!sid && nm) {
				var list = this.getModel("view").getProperty("/suppliers") || [];
				var hit = list.filter(function (s) {
					return s.supplierName === nm;
				})[0];
				sid = hit && hit.supplierId;
			}
			if (sid) {
				this.getRouter().navTo("supplierDetail", { supplierId: sid });
			}
		},

		_bindCharts: function () {
			var oModel = this.getModel("view");
			if (!oModel) {
				return;
			}

			var oPieDash = this.byId("vizRiskPieDashboard");
			var oPieOrders = this.byId("vizOrdersRiskPieDashboard");
			var oPieRev = this.byId("vizRevenueRiskPieDashboard");
			var oStack = this.byId("vizOrdersStack");
			var oBubble = this.byId("vizVolatilityBubble");
			var oLateC = this.byId("vizLateCountry");
			var oAvgD = this.byId("vizAvgDelaySupplier");

			if (!oPieDash || !oPieOrders || !oPieRev || !oStack || !oBubble
				|| !oLateC || !oAvgD) {
				return;
			}

			[oPieDash, oPieOrders, oPieRev, oStack, oBubble, oLateC, oAvgD].forEach(function (v) {
				this._prepViz(v, oModel);
			}, this);

			if (!this._countryChartSelectAttached) {
				oLateC.attachSelectData(this._onCountryChartSelect.bind(this));
				oLateC.attachDeselectData(this._onCountryChartDeselect.bind(this));
				this._countryChartSelectAttached = true;
			}

			if (!this._bubbleSelectAttached) {
				oBubble.attachSelectData(this._onVolatilityBubbleSelect.bind(this));
				oBubble.attachDeselectData(this._onVolatilityBubbleDeselect.bind(this));
				this._bubbleSelectAttached = true;
			}

			if (!this._avgDelaySelectAttached) {
				oAvgD.attachSelectData(this._onAvgDelayChartSelect.bind(this));
				this._avgDelaySelectAttached = true;
			}

			this._safeDestroyDataset(oPieDash);
			this._safeDestroyFeeds(oPieDash);
			oPieDash.setDataset(new FlattenedDataset({
				data: { path: "/charts/riskPie", model: "view" },
				dimensions: [{ name: "category", value: "{category}" }],
				measures: [{ name: "value", value: "{value}" }]
			}));
			oPieDash.addFeed(new FeedItem({ uid: "size", type: "Measure", values: ["value"] }));
			oPieDash.addFeed(new FeedItem({ uid: "color", type: "Dimension", values: ["category"] }));
			oPieDash.setVizProperties({
				title: { visible: false, text: "" },
				plotArea: {
					colorPalette: ["#107E3E", "#E9730C", "#BB0000"],
					dataLabel: { visible: true, hideWhenOverlap: false }
				}
			});

			this._safeDestroyDataset(oPieOrders);
			this._safeDestroyFeeds(oPieOrders);
			oPieOrders.setDataset(new FlattenedDataset({
				data: { path: "/charts/ordersRiskPie", model: "view" },
				dimensions: [{ name: "category", value: "{category}" }],
				measures: [{ name: "value", value: "{value}" }]
			}));
			oPieOrders.addFeed(new FeedItem({ uid: "size", type: "Measure", values: ["value"] }));
			oPieOrders.addFeed(new FeedItem({ uid: "color", type: "Dimension", values: ["category"] }));
			oPieOrders.setVizProperties({
				title: { visible: false, text: "" },
				plotArea: {
					colorPalette: ["#107E3E", "#E9730C", "#BB0000"],
					dataLabel: { visible: true, hideWhenOverlap: false }
				}
			});

			this._safeDestroyDataset(oPieRev);
			this._safeDestroyFeeds(oPieRev);
			oPieRev.setDataset(new FlattenedDataset({
				data: { path: "/charts/revenueRiskPie", model: "view" },
				dimensions: [{ name: "category", value: "{category}" }],
				measures: [{ name: "value", value: "{value}" }]
			}));
			oPieRev.addFeed(new FeedItem({ uid: "size", type: "Measure", values: ["value"] }));
			oPieRev.addFeed(new FeedItem({ uid: "color", type: "Dimension", values: ["category"] }));
			oPieRev.setVizProperties({
				title: { visible: false, text: "" },
				plotArea: {
					colorPalette: ["#107E3E", "#E9730C", "#BB0000"],
					dataLabel: { visible: true, hideWhenOverlap: false }
				}
			});

			this._safeDestroyDataset(oStack);
			this._safeDestroyFeeds(oStack);
			var oRbStack = this.getResourceBundle();
			var sMOn = oRbStack.getText("stackLegendOnTime");
			var sM03 = oRbStack.getText("stackLegendLate03");
			var sM310 = oRbStack.getText("stackLegendLate310");
			var sM10 = oRbStack.getText("stackLegendLate10");
			oStack.setVizType("stacked_bar");
			oStack.setDataset(new FlattenedDataset({
				data: { path: "/charts/ordersStacked", model: "view" },
				dimensions: [{ name: "supplier", value: "{supplier}" }],
				measures: [
					{ name: sMOn, value: "{mOnTime}" },
					{ name: sM03, value: "{mLate03}" },
					{ name: sM310, value: "{mLate310}" },
					{ name: sM10, value: "{mLate10}" }
				]
			}));
			oStack.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["supplier"] }));
			oStack.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: [sMOn, sM03, sM310, sM10] }));
			oStack.setVizProperties({
				title: { visible: false, text: "" },
				plotArea: {
					animation: _plotHover.animation,
					dataLabel: { visible: true, formatString: "", hideWhenOverlap: false },
					gridline: _plotHover.gridline,
					colorPalette: ["#107E3E", "#6BBF59", "#E9730C", "#BB0000"]
				},
				valueAxis: Object.assign({}, _axisBarValue, {
					title: { visible: true, text: oRbStack.getText("axisOrderCount") }
				}),
				categoryAxis: Object.assign({}, _axisBarCategory, {
					title: { visible: true, text: oRbStack.getText("axisSupplier") }
				}),
				legend: { visible: true, label: { truncateLabel: false } }
			});

			var aStackRows = oModel.getProperty("/charts/ordersStacked") || [];
			var nStackH = Math.max(280, aStackRows.length * 34 + 220);
			oStack.setHeight(nStackH + "px");

			this._safeDestroyDataset(oBubble);
			this._safeDestroyFeeds(oBubble);
			var oRbBubble = this.getResourceBundle();
			oBubble.setVizType("bubble");
			oBubble.setDataset(new FlattenedDataset({
				data: { path: "/charts/volatilityBubbles", model: "view" },
				dimensions: [{ name: "supplier", value: "{supplier}" }],
				measures: [
					{ name: "orderCount", value: "{orderCount}" },
					{ name: "avgDelayDays", value: "{avgDelayDays}" },
					{ name: "revenue", value: "{revenue}" }
				]
			}));
			oBubble.addFeed(new FeedItem({ uid: "color", type: "Dimension", values: ["supplier"] }));
			oBubble.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["orderCount"] }));
			oBubble.addFeed(new FeedItem({ uid: "valueAxis2", type: "Measure", values: ["avgDelayDays"] }));
			oBubble.addFeed(new FeedItem({ uid: "bubbleWidth", type: "Measure", values: ["revenue"] }));
			oBubble.setVizProperties({
				title: { visible: false, text: "" },
				plotArea: {
					animation: _plotHover.animation,
					dataLabel: { visible: false },
					gridline: _plotHover.gridline
				},
				valueAxis: {
					title: { visible: true, text: oRbBubble.getText("volatilityAxisOrders") },
					label: { truncateLabel: false }
				},
				valueAxis2: {
					title: { visible: true, text: oRbBubble.getText("volatilityAxisDelay") },
					label: { truncateLabel: false }
				},
				legend: { visible: false }
			});

			this._safeDestroyDataset(oLateC);
			this._safeDestroyFeeds(oLateC);
			var oRbCountry = this.getResourceBundle();
			var sCountryOnTime = oRbCountry.getText("countryPayOnTime");
			var sCountryLate = oRbCountry.getText("countryPayLate");
			oLateC.setVizType("stacked_bar");
			oLateC.setDataset(new FlattenedDataset({
				data: { path: "/charts/latePctByCountry", model: "view" },
				dimensions: [{ name: "country", value: "{country}" }],
				measures: [
					{ name: sCountryOnTime, value: "{onTimePct}" },
					{ name: sCountryLate, value: "{latePct}" }
				]
			}));
			oLateC.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["country"] }));
			oLateC.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: [sCountryOnTime, sCountryLate] }));
			oLateC.setVizProperties({
				title: { visible: false, text: "" },
				plotArea: Object.assign({}, this._countryBarPlotArea(), {
					orientation: "horizontal",
					colorPalette: ["#107E3E", "#BB0000"],
					dataLabel: { visible: true, formatString: "##.#", hideWhenOverlap: false }
				}),
				valueAxis: {
					title: { visible: true, text: oRbCountry.getText("axisSharePercent") },
					label: { formatString: "##.#" },
					scale: {
						fixedRange: true,
						minValue: 0,
						maxValue: 100
					}
				},
				categoryAxis: Object.assign({}, _axisCountryCategory, {
					title: { visible: true, text: oRbCountry.getText("axisCountry") }
				}),
				legend: { visible: true, label: { truncateLabel: false } }
			});

			this._safeDestroyDataset(oAvgD);
			this._safeDestroyFeeds(oAvgD);
			var oRbAvg = this.getResourceBundle();
			oAvgD.setVizType("column");
			oAvgD.setDataset(new FlattenedDataset({
				data: { path: "/charts/avgDelayBySupplier", model: "view" },
				dimensions: [{ name: "supplier", value: "{supplier}" }],
				measures: [{ name: "avgDelay", value: "{avgDelay}" }]
			}));
			oAvgD.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["supplier"] }));
			oAvgD.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["avgDelay"] }));
			oAvgD.setVizProperties({
				title: { visible: false, text: "" },
				plotArea: _plotHover,
				valueAxis: { title: { visible: true, text: oRbAvg.getText("volatilityAxisDelay") } },
				categoryAxis: Object.assign({}, _axisNoTruncate, {
					title: { visible: true, text: oRbAvg.getText("axisSupplier") }
				})
			});
		}
	});
});
