sap.ui.define([], function () {
	"use strict";

	function formatCurrencyEUR(v) {
		if (v === undefined || v === null || isNaN(v)) {
			return "";
		}
		var oFmt = sap.ui.core.format.NumberFormat.getCurrencyInstance({
			currencyCode: false,
			currency: "EUR",
			maxFractionDigits: 0,
			minFractionDigits: 0
		});
		return oFmt.format(v);
	}

	function formatPercent(v) {
		if (v === undefined || v === null || isNaN(v)) {
			return "";
		}
		return Math.round(v * 1000) / 10 + "%";
	}

	function formatPercent0to100(v) {
		if (v === undefined || v === null || isNaN(v)) {
			return "";
		}
		return (Math.round(v * 10) / 10) + "%";
	}

	function formatKpiNumber(v) {
		if (v === undefined || v === null || isNaN(v)) {
			return "";
		}
		return Math.round(v * 10) / 10;
	}

	/** Integer as plain digits only (for Text tiles — NumericContent clips/wraps long counts). */
	function formatPlainInteger(v) {
		if (v === undefined || v === null || isNaN(v)) {
			return "";
		}
		return String(Math.round(Number(v)));
	}

	function formatAvgDelayDays(v) {
		if (v === undefined || v === null || isNaN(v)) {
			return "";
		}
		var n = Math.round(Number(v) * 10) / 10;
		var oFmt = sap.ui.core.format.NumberFormat.getFloatInstance({
			minFractionDigits: 1,
			maxFractionDigits: 1
		});
		return oFmt.format(n);
	}

	function orderLateState(isLate) {
		return isLate ? "Error" : "Success";
	}

	function formatMillionsEUR(v) {
		if (v === undefined || v === null || isNaN(v)) {
			return "";
		}
		var m = v / 1000000;
		return Math.round(m * 10) / 10;
	}

	function formatShortDate(iso) {
		if (!iso) {
			return "";
		}
		var d = new Date(iso);
		if (isNaN(d.getTime())) {
			return iso;
		}
		var oFmt = sap.ui.core.format.DateFormat.getDateInstance({ style: "medium" });
		return oFmt.format(d);
	}

	function riskIcon(sRisk) {
		switch (sRisk) {
			case "GREEN":
				return "sap-icon://message-success";
			case "YELLOW":
				return "sap-icon://message-warning";
			case "RED":
				return "sap-icon://message-error";
			default:
				return "sap-icon://hint";
		}
	}

	function riskState(sRisk) {
		switch (sRisk) {
			case "GREEN":
				return "Success";
			case "YELLOW":
				return "Warning";
			case "RED":
				return "Error";
			default:
				return "None";
		}
	}

	function riskTooltip(sRisk, oBundle) {
		if (!oBundle || !oBundle.getText) {
			return "";
		}
		try {
			return oBundle.getText("riskHint" + sRisk);
		} catch (e) {
			return "";
		}
	}

	function riskTooltipHint(sRisk) {
		switch (sRisk) {
			case "GREEN":
				return "Payment delay ≤ 3 days on average; no orders paid more than 3 days late.";
			case "YELLOW":
				return "Avg. payment delay 4–10 days, or first warning (≥1 order paid >3 days after due date).";
			case "RED":
				return "Avg. payment delay >10 days, or second warning (≥2 orders paid >3 days after due date).";
			default:
				return "";
		}
	}

	return {
		orderLateState: orderLateState,
		formatAvgDelayDays: formatAvgDelayDays,
		formatKpiNumber: formatKpiNumber,
		formatPlainInteger: formatPlainInteger,
		formatPercent0to100: formatPercent0to100,
		riskTooltipHint: riskTooltipHint,
		formatMillionsEUR: formatMillionsEUR,
		formatCurrencyEUR: formatCurrencyEUR,
		formatPercent: formatPercent,
		formatShortDate: formatShortDate,
		riskIcon: riskIcon,
		riskState: riskState,
		riskTooltip: riskTooltip
	};
});
