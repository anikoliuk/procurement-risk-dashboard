sap.ui.define([], function () {
	"use strict";

	var RISK = {
		GREEN: "GREEN",
		YELLOW: "YELLOW",
		RED: "RED"
	};

	var PAYMENT_STATUS = {
		ON_TIME: "ON_TIME",
		LATE_0_3: "LATE_0_3",
		LATE_3_10: "LATE_3_10",
		LATE_10_PLUS: "LATE_10_PLUS"
	};

	var PORTFOLIO_GREEN_COUNT = 80;
	var PORTFOLIO_YELLOW_COUNT = 12;
	var PORTFOLIO_RED_COUNT = 8;
	var SUPPLIER_COUNT = PORTFOLIO_GREEN_COUNT + PORTFOLIO_YELLOW_COUNT + PORTFOLIO_RED_COUNT;

	var RISK_WINDOW_ORDER_COUNT = 3;
	var RISK_RED_AVG_DELAY_DAYS = 10;
	var RISK_RED_MIN_ORDERS_OVER_DELAY_DAYS = 2;
	var RISK_RED_ORDER_DELAY_THRESHOLD = 10;

	var COUNTRIES = ["Germany", "Poland", "Netherlands", "France", "Italy"];

	function _pad(num, len) {
		var s = String(num);
		while (s.length < len) {
			s = "0" + s;
		}
		return s;
	}

	function pseudoRandom(seed) {
		var x = Math.sin(seed * 9301 + 49297) * 43758.5453;
		return x - Math.floor(x);
	}

	function addDaysISO(isoDateStr, days) {
		var d = new Date(isoDateStr);
		if (isNaN(d.getTime())) {
			return isoDateStr;
		}
		d.setUTCDate(d.getUTCDate() + Math.round(days));
		return d.toISOString().slice(0, 10);
	}

	function daysBetweenDueAndPayment(dueISO, payISO) {
		var due = new Date(dueISO).setUTCHours(0, 0, 0, 0);
		var pay = new Date(payISO).setUTCHours(0, 0, 0, 0);
		return Math.round((pay - due) / 86400000);
	}

	function paymentCategoryFromDelay(delayDays) {
		var dd = typeof delayDays === "number" ? delayDays : 0;
		if (dd <= 0) {
			return PAYMENT_STATUS.ON_TIME;
		}
		if (dd >= 1 && dd <= 3) {
			return PAYMENT_STATUS.LATE_0_3;
		}
		if (dd >= 4 && dd <= 10) {
			return PAYMENT_STATUS.LATE_3_10;
		}
		return PAYMENT_STATUS.LATE_10_PLUS;
	}

	function applyPaymentCategoryToOrder(o) {
		if (!o) {
			return o;
		}
		var dd = typeof o.delayDays === "number"
			? o.delayDays
			: daysBetweenDueAndPayment(o.dueDate, o.paymentDate);
		o.delayDays = dd;
		o.paymentDate = addDaysISO(o.dueDate, dd);
		o.isLate = dd > 0;
		o.paymentStatusCategory = paymentCategoryFromDelay(dd);
		return o;
	}

	function syncOrderCategories(orders) {
		(orders || []).forEach(function (o) {
			if (o && o.country != null && o.country !== "") {
				var tc = String(o.country).trim();
				o.country = tc || undefined;
			}
			applyPaymentCategoryToOrder(o);
		});
	}

	function countryGroupFromOrder(o) {
		var trimmed = "";
		if (o && o.country != null && o.country !== "") {
			trimmed = String(o.country).trim();
		}
		if (!trimmed) {
			return { key: "_unknown", label: "Unknown" };
		}
		return { key: trimmed.toLowerCase(), label: trimmed };
	}

	function setOrderPaymentDelay(order, delayDays) {
		order.paymentDate = addDaysISO(order.dueDate, delayDays);
		order.delayDays = daysBetweenDueAndPayment(order.dueDate, order.paymentDate);
		order.isLate = order.delayDays > 0;
		order.paymentStatusCategory = paymentCategoryFromDelay(order.delayDays);
	}

	function indexOfLargestAmount(orders) {
		var idx = 0;
		var max = orders[0].amount || 0;
		for (var k = 1; k < orders.length; k++) {
			if ((orders[k].amount || 0) > max) {
				max = orders[k].amount;
				idx = k;
			}
		}
		return idx;
	}

	function pickOrderCountForSupplier(seed) {
		var r = pseudoRandom(seed * 11 + 101);
		if (r < 0.07) {
			return 2 + Math.floor(pseudoRandom(seed * 13 + 7) * 3);
		}
		if (r < 0.16) {
			return 5 + Math.floor(pseudoRandom(seed * 17 + 9) * 5);
		}
		if (r < 0.34) {
			return 10 + Math.floor(pseudoRandom(seed * 19 + 3) * 35);
		}
		if (r < 0.62) {
			return 45 + Math.floor(pseudoRandom(seed * 23 + 5) * 75);
		}
		if (r < 0.88) {
			return 120 + Math.floor(pseudoRandom(seed * 29 + 2) * 95);
		}
		return 200 + Math.floor(pseudoRandom(seed * 31 + 11) * 220);
	}

	function applyMixedDelaysToDraftOrders(draftOrders, supplierIndex) {
		var nGreen = PORTFOLIO_GREEN_COUNT;
		var nYellow = PORTFOLIO_YELLOW_COUNT;
		var idxMax = indexOfLargestAmount(draftOrders);
		var seedBase = (supplierIndex + 1) * 7919;
		var tier = supplierIndex < nGreen ? "G" : (supplierIndex < nGreen + nYellow ? "Y" : "R");

		draftOrders.forEach(function (o, oi) {
			// keep the largest invoice in a stable zone for better mock spread
			if (oi === idxMax) {
				setOrderPaymentDelay(o, -1 - Math.floor(pseudoRandom(seedBase + oi * 17) * 5));
				return;
			}
			var u = pseudoRandom(seedBase + oi * 47 + oi * oi);
			var d;
			if (tier === "G") {
				if (u < 0.78) {
					d = -Math.floor(pseudoRandom(seedBase + oi * 53) * 8);
				} else if (u < 0.93) {
					d = Math.floor(pseudoRandom(seedBase + oi * 59) * 3);
				} else if (u < 0.982) {
					d = 1 + Math.floor(pseudoRandom(seedBase + oi * 61) * 2);
				} else if (u < 0.994) {
					d = 4 + Math.floor(pseudoRandom(seedBase + oi * 67) * 5);
				} else {
					d = 10 + Math.floor(pseudoRandom(seedBase + oi * 71) * 12);
				}
			} else if (tier === "Y") {
				if (u < 0.15) {
					d = -Math.floor(pseudoRandom(seedBase + oi * 73) * 3);
				} else if (u < 0.35) {
					d = Math.floor(pseudoRandom(seedBase + oi * 79) * 3);
				} else if (u < 0.55) {
					d = 1 + Math.floor(pseudoRandom(seedBase + oi * 83) * 3);
				} else if (u < 0.88) {
					d = 4 + Math.floor(pseudoRandom(seedBase + oi * 89) * 7);
				} else {
					d = 11 + Math.floor(pseudoRandom(seedBase + oi * 97) * 16);
				}
			} else {
				if (u < 0.08) {
					d = -1 - Math.floor(pseudoRandom(seedBase + oi * 101) * 2);
				} else if (u < 0.2) {
					d = Math.floor(pseudoRandom(seedBase + oi * 103) * 2);
				} else if (u < 0.35) {
					d = 1 + Math.floor(pseudoRandom(seedBase + oi * 107) * 3);
				} else if (u < 0.55) {
					d = 4 + Math.floor(pseudoRandom(seedBase + oi * 109) * 7);
				} else {
					d = 11 + Math.floor(pseudoRandom(seedBase + oi * 113) * 25);
				}
			}
			setOrderPaymentDelay(o, d);
		});
	}

	function supplierDisplayName(index) {
		var known = [
			"Robert Bosch GmbH", "Siemens Mobility PL", "Beiersdorf AG", "ABB Schweiz Components",
			"Maersk Logistics BV", "SAP Deutschland SE", "Michelin Nordic AB", "Stora Enso Oyj",
			"Zalando SE", "Air Liquide Deutschland", "Konecranes Oy", "LafargeHolcim EU",
			"Evonik Operations GmbH", "Ikea Supply BV", "Rhenus Warehousing NV", "Continental Automotive GmbH",
			"ArcelorMittal Poland", "Deutsche Post DHL Supply Chain", "ThyssenKrupp Materials", "Leonardo SpA"
		];
		if (index < known.length) {
			return known[index];
		}
		var k = index + 1;
		var pool = ["Logistics", "Components", "Trading", "Manufacturing", "Services", "Industrial", "Retail"];
		return "EU Procurement Partner " + _pad(k, 3) + " (" + pool[index % pool.length] + ", " + COUNTRIES[index % COUNTRIES.length] + ")";
	}

	function generateTransactionalPortfolio() {
		var orders = [];
		var baseDueStr = "2024-06-01";
		var i;
		for (i = 0; i < SUPPLIER_COUNT; i++) {
			var seed = (i + 1) * 7919;
			var nOrders = pickOrderCountForSupplier(seed);
			var country = COUNTRIES[i % COUNTRIES.length];
			var supplierId = "SUP-" + _pad(i + 1, 3);
			var supplierName = supplierDisplayName(i);
			var draftOrders = [];
			var o;
			for (o = 0; o < nOrders; o++) {
				var r = pseudoRandom(seed + o * 31 + 17);
				var dueOffset = Math.floor(r * 420) + o * 3;
				var dueISO = addDaysISO(baseDueStr, dueOffset);
				var amount = Math.round(15000 + pseudoRandom(seed + o * 101) * 850000);
				draftOrders.push({
					orderId: "ORD-" + _pad(i + 1, 3) + "-" + _pad(o + 1, 4),
					amount: amount,
					dueDate: dueISO,
					paymentDate: dueISO,
					delayDays: 0,
					isLate: false
				});
			}
			var cohortMul;
			if (i < PORTFOLIO_GREEN_COUNT) {
				cohortMul = 6 + pseudoRandom(seed * 499 + 3) * 14;
			} else if (i < PORTFOLIO_GREEN_COUNT + PORTFOLIO_YELLOW_COUNT) {
				cohortMul = 0.1 + pseudoRandom(seed * 501 + 5) * 0.38;
			} else {
				cohortMul = 0.05 + pseudoRandom(seed * 503 + 7) * 0.2;
			}
			draftOrders.forEach(function (row) {
				row.amount = Math.max(100, Math.round(row.amount * cohortMul));
			});
			applyMixedDelaysToDraftOrders(draftOrders, i);
			draftOrders.forEach(function (row) {
				orders.push({
					orderId: row.orderId,
					supplierId: supplierId,
					supplierName: supplierName,
					country: country,
					amount: row.amount,
					dueDate: row.dueDate,
					paymentDate: row.paymentDate,
					delayDays: row.delayDays,
					isLate: row.isLate,
					paymentStatusCategory: row.paymentStatusCategory
				});
			});
		}
		syncOrderCategories(orders);
		return orders;
	}

	function buildSuppliersFromOrders(orders) {
		var map = {};
		(orders || []).forEach(function (o) {
			var id = o.supplierId;
			if (!map[id]) {
				map[id] = {
					supplierId: id,
					supplierName: o.supplierName,
					country: countryGroupFromOrder(o).label,
					orders: []
				};
			}
			map[id].orders.push(o);
		});
		var ids = Object.keys(map).sort();
		return ids.map(function (id) {
			return map[id];
		});
	}

	function filterOrdersForSuppliers(orders, suppliers) {
		var id = {};
		(suppliers || []).forEach(function (s) {
			id[s.supplierId] = true;
		});
		return (orders || []).filter(function (o) {
			return id[o.supplierId];
		});
	}

	function calculateSupplierMetrics(supplier) {
		var orderList = supplier.orders || [];
		var totalOrders = orderList.length;
		var lateOrders = 0;
		var onTimeOrders = 0;
		var earlyOrders = 0;
		var sumDelayAll = 0;
		var sumDelayLate = 0;
		var totalAmount = 0;
		var maxDelay = 0;
		var severeLateOrders = 0;

		orderList.forEach(function (o) {
			applyPaymentCategoryToOrder(o);
			var dd = o.delayDays || 0;
			totalAmount += o.amount || 0;
			sumDelayAll += dd;
			if (dd > maxDelay) {
				maxDelay = dd;
			}
			if (dd < 0) {
				earlyOrders++;
			}
			if (dd > 0) {
				lateOrders++;
				sumDelayLate += dd;
			} else {
				onTimeOrders++;
			}
			if (dd > 10) {
				severeLateOrders++;
			}
		});

		supplier.totalOrders = totalOrders;
		supplier.lateOrders = lateOrders;
		supplier.onTimeOrders = onTimeOrders;
		supplier.earlyOrders = earlyOrders;
		supplier.earlyPaymentShare = totalOrders ? earlyOrders / totalOrders : 0;
		supplier.latePercentage = totalOrders ? (lateOrders / totalOrders) * 100 : 0;
		supplier.averageDelayLateOnly = round1(lateOrders ? sumDelayLate / lateOrders : 0);
		supplier.averagePaymentDelayDays = round1(totalOrders ? sumDelayAll / totalOrders : 0);
		supplier.totalAmount = Math.round(totalAmount * 100) / 100;
		supplier.maxOrderDelayDays = maxDelay;
		supplier.severeLateOrders = severeLateOrders;
		supplier.latePaymentsCount = lateOrders;
		supplier.onTimePaymentRate = totalOrders ? onTimeOrders / totalOrders : 0;
		supplier.abmahnungCount = orderList.filter(function (o) {
			return (o.delayDays || 0) > 3;
		}).length;

		supplier.riskScore = Math.round((lateOrders * 2 + supplier.averagePaymentDelayDays + maxDelay * 0.35) * 100) / 100;

		return supplier;
	}

	function getOrdersForRiskWindow(orderList, maxCount) {
		var list = orderList || [];
		if (!list.length) {
			return [];
		}
		var sorted = list.slice().sort(function (a, b) {
			var da = String(a.dueDate || "");
			var db = String(b.dueDate || "");
			if (da !== db) {
				return db.localeCompare(da);
			}
			return String(b.id || b.orderId || "").localeCompare(String(a.id || a.orderId || ""));
		});
		var n = Math.min(maxCount, sorted.length);
		return sorted.slice(0, n);
	}

	function calculateRiskStatus(supplier) {
		var windowOrders = getOrdersForRiskWindow(supplier.orders, RISK_WINDOW_ORDER_COUNT);
		var wi;
		var len = windowOrders.length;
		if (!len) {
			return RISK.GREEN;
		}

		var sumDelay = 0;
		var maxD = 0;
		var ordersOver10 = 0;
		var ordersOver3 = 0;

		for (wi = 0; wi < len; wi++) {
			var dd = windowOrders[wi].delayDays || 0;
			sumDelay += dd;
			if (dd > maxD) {
				maxD = dd;
			}
			if (dd > RISK_RED_ORDER_DELAY_THRESHOLD) {
				ordersOver10++;
			}
			if (dd > 3) {
				ordersOver3++;
			}
		}

		var avgDelay = sumDelay / len;

		if (avgDelay > RISK_RED_AVG_DELAY_DAYS || ordersOver10 >= RISK_RED_MIN_ORDERS_OVER_DELAY_DAYS) {
			return RISK.RED;
		}

		if (
			(avgDelay >= 4 && avgDelay <= RISK_RED_AVG_DELAY_DAYS) ||
			(maxD >= 4 && maxD <= RISK_RED_AVG_DELAY_DAYS) ||
			maxD > RISK_RED_ORDER_DELAY_THRESHOLD ||
			ordersOver3 > 0
		) {
			return RISK.YELLOW;
		}

		return RISK.GREEN;
	}

	function enrichSupplier(supplier, oBundle) {
		calculateSupplierMetrics(supplier);
		supplier.riskStatus = calculateRiskStatus(supplier);
		supplier.riskStatusText = supplier.riskStatus;
		if (oBundle && oBundle.getText) {
			try {
				supplier.riskStatusText = oBundle.getText("risk" + supplier.riskStatus);
			} catch (e) {}
		}
		return supplier;
	}

	function matchesDelayRange(avgDelay, delayRangeKey) {
		if (!delayRangeKey) {
			return true;
		}
		if (delayRangeKey === "0-3") {
			return avgDelay >= 0 && avgDelay <= 3;
		}
		if (delayRangeKey === "4-10") {
			return avgDelay >= 4 && avgDelay <= 10;
		}
		if (delayRangeKey === "10+") {
			return avgDelay > 10;
		}
		return true;
	}

	function matchesAbmahnungFilter(abCount, filterVal) {
		if (filterVal === "" || filterVal === undefined || filterVal === null) {
			return true;
		}
		var min = parseInt(filterVal, 10);
		if (isNaN(min)) {
			return true;
		}
		return (abCount || 0) >= min;
	}

	function applyFilters(suppliers, filterState) {
		var q = (filterState.search || "").trim().toLowerCase();
		var country = filterState.country || "";
		var riskStatus = filterState.riskStatus || "";
		var delayRange = filterState.delayRange || "";
		var abmahnungMin = filterState.abmahnungMin;

		return suppliers.filter(function (s) {
			if (q && (String(s.supplierName).toLowerCase().indexOf(q) < 0
				&& String(s.supplierId).toLowerCase().indexOf(q) < 0)) {
				return false;
			}
			if (country && s.country !== country) {
				return false;
			}
			if (riskStatus && s.riskStatus !== riskStatus) {
				return false;
			}
			if (!matchesDelayRange(s.averagePaymentDelayDays || 0, delayRange)) {
				return false;
			}
			if (!matchesAbmahnungFilter(s.abmahnungCount, abmahnungMin)) {
				return false;
			}
			return true;
		});
	}

	function sortSuppliers(list, sortKey, descending) {
		var copy = list.slice();
		var dir = descending ? -1 : 1;
		copy.sort(function (a, b) {
			var va;
			var vb;
			if (sortKey === "supplierName") {
				va = String(a.supplierName || "").toLowerCase();
				vb = String(b.supplierName || "").toLowerCase();
			} else if (sortKey === "country") {
				va = String(a.country || "").toLowerCase();
				vb = String(b.country || "").toLowerCase();
			} else if (sortKey === "totalOrders") {
				va = a.totalOrders || 0;
				vb = b.totalOrders || 0;
			} else if (sortKey === "totalAmount") {
				va = a.totalAmount || 0;
				vb = b.totalAmount || 0;
			} else if (sortKey === "averagePaymentDelayDays") {
				va = a.averagePaymentDelayDays || 0;
				vb = b.averagePaymentDelayDays || 0;
			} else if (sortKey === "latePercentage") {
				va = a.latePercentage || 0;
				vb = b.latePercentage || 0;
			} else if (sortKey === "lateOrders") {
				va = a.lateOrders || 0;
				vb = b.lateOrders || 0;
			} else if (sortKey === "onTimePaymentRate") {
				va = a.onTimePaymentRate != null ? a.onTimePaymentRate : -1;
				vb = b.onTimePaymentRate != null ? b.onTimePaymentRate : -1;
			} else if (sortKey === "riskStatus") {
				va = a.riskStatus === RISK.GREEN ? 0 : (a.riskStatus === RISK.YELLOW ? 1 : 2);
				vb = b.riskStatus === RISK.GREEN ? 0 : (b.riskStatus === RISK.YELLOW ? 1 : 2);
			} else if (sortKey === "riskScore") {
				va = a.riskScore || 0;
				vb = b.riskScore || 0;
			} else {
				va = a.supplierName || "";
				vb = b.supplierName || "";
			}
			if (va < vb) {
				return -1 * dir;
			}
			if (va > vb) {
				return 1 * dir;
			}
			return 0;
		});
		return copy;
	}

	function round1(x) {
		return Math.round(x * 10) / 10;
	}

	function round2(x) {
		return Math.round(x * 100) / 100;
	}

	function textOrFallback(oBundle, key, fallback) {
		if (!oBundle || !oBundle.getText) {
			return fallback;
		}
		try {
			return oBundle.getText(key);
		} catch (e) {
			return fallback;
		}
	}

	function collectRiskBySupplier(enrichedSuppliers) {
		var riskBySupplierId = {};
		var greens = 0;
		var yellows = 0;
		var reds = 0;

		(enrichedSuppliers || []).forEach(function (supplier) {
			riskBySupplierId[supplier.supplierId] = supplier.riskStatus;
			if (supplier.riskStatus === RISK.GREEN) {
				greens++;
			} else if (supplier.riskStatus === RISK.YELLOW) {
				yellows++;
			} else {
				reds++;
			}
		});

		return {
			riskBySupplierId: riskBySupplierId,
			greens: greens,
			yellows: yellows,
			reds: reds
		};
	}

	function collectOrderRiskStats(orders, riskBySupplierId) {
		var greenCount = 0;
		var yellowCount = 0;
		var redCount = 0;
		var greenRevenue = 0;
		var yellowRevenue = 0;
		var redRevenue = 0;

		(orders || []).forEach(function (order) {
			var riskStatus = riskBySupplierId[order.supplierId];
			var amount = order.amount || 0;
			if (riskStatus === RISK.GREEN) {
				greenCount++;
				greenRevenue += amount;
			} else if (riskStatus === RISK.YELLOW) {
				yellowCount++;
				yellowRevenue += amount;
			} else {
				redCount++;
				redRevenue += amount;
			}
		});

		return {
			greenCount: greenCount,
			yellowCount: yellowCount,
			redCount: redCount,
			greenRevenue: greenRevenue,
			yellowRevenue: yellowRevenue,
			redRevenue: redRevenue
		};
	}

	function buildTotalRevenueKpiParts(volume, oBundle) {
		var v = typeof volume === "number" ? volume : 0;
		var txtB = textOrFallback(oBundle, "scaleRevenueBillions", "B €");
		var txtM = textOrFallback(oBundle, "scaleRevenueMillions", "M €");
		var txtK = textOrFallback(oBundle, "scaleRevenueThousands", "K €");
		var txtEur = textOrFallback(oBundle, "scaleRevenueEuro", "€");
		if (v >= 1000000000) {
			return { revenueKpiDisplayValue: round1(v / 1000000000), revenueKpiDisplayScale: txtB };
		}
		if (v >= 1000000) {
			return { revenueKpiDisplayValue: round1(v / 1000000), revenueKpiDisplayScale: txtM };
		}
		if (v >= 1000) {
			return { revenueKpiDisplayValue: round1(v / 1000), revenueKpiDisplayScale: txtK };
		}
		return { revenueKpiDisplayValue: round2(v), revenueKpiDisplayScale: txtEur };
	}

	function calculateKPIsFromOrders(orders, enrichedSuppliers, oBundle) {
		syncOrderCategories(orders);
		var supplierIds = {};
		var totalOrders = orders.length;
		var totalOnTime = 0;
		var totalLate = 0;
		var sumDelayLate = 0;
		var lateCount = 0;
		var volume = 0;

		orders.forEach(function (o) {
			supplierIds[o.supplierId] = true;
			volume += o.amount || 0;
			var dd = o.delayDays || 0;
			if (dd <= 0) {
				totalOnTime++;
			} else {
				totalLate++;
				sumDelayLate += dd;
				lateCount++;
			}
		});

		var totalSuppliers = Object.keys(supplierIds).length;
		var onTimePaymentRate = totalOrders ? (totalOnTime / totalOrders) * 100 : 0;
		var latePaymentRate = totalOrders ? (totalLate / totalOrders) * 100 : 0;
		var averageDelayLateOnly = lateCount ? sumDelayLate / lateCount : 0;

		var greens = 0;
		var yellows = 0;
		var reds = 0;
		var ordersGreenTier = 0;
		var ordersYellowTier = 0;
		var ordersRedTier = 0;

		var supplierRiskSummary = collectRiskBySupplier(enrichedSuppliers);
		var orderRiskSummary = collectOrderRiskStats(orders, supplierRiskSummary.riskBySupplierId);
		greens = supplierRiskSummary.greens;
		yellows = supplierRiskSummary.yellows;
		reds = supplierRiskSummary.reds;
		ordersGreenTier = orderRiskSummary.greenCount;
		ordersYellowTier = orderRiskSummary.yellowCount;
		ordersRedTier = orderRiskSummary.redCount;

		var revParts = buildTotalRevenueKpiParts(volume, oBundle);

		return {
			totalSuppliers: totalSuppliers,
			totalOrders: totalOrders,
			onTimePaymentRate: round2(onTimePaymentRate),
			latePaymentRate: round2(latePaymentRate),
			averageDelayLateOnly: round1(averageDelayLateOnly),
			totalProcurementVolume: round2(volume),
			revenueKpiDisplayValue: revParts.revenueKpiDisplayValue,
			revenueKpiDisplayScale: revParts.revenueKpiDisplayScale,
			greenSuppliers: greens,
			yellowSuppliers: yellows,
			redSuppliers: reds,
			riskGreenSupplierPct: totalSuppliers ? round1((greens / totalSuppliers) * 100) : 0,
			riskYellowSupplierPct: totalSuppliers ? round1((yellows / totalSuppliers) * 100) : 0,
			riskRedSupplierPct: totalSuppliers ? round1((reds / totalSuppliers) * 100) : 0,
			ordersGreenTierPct: totalOrders ? round1((ordersGreenTier / totalOrders) * 100) : 0,
			ordersYellowTierPct: totalOrders ? round1((ordersYellowTier / totalOrders) * 100) : 0,
			ordersRedTierPct: totalOrders ? round1((ordersRedTier / totalOrders) * 100) : 0
		};
	}

	function calculateChartsData(orders, enrichedSuppliers, options, oBundle) {
		options = options || {};
		var dashCountry = options.dashboardCountry || "";
		syncOrderCategories(orders);

		var greens = 0;
		var yellows = 0;
		var reds = 0;
		var ordGreen = 0;
		var ordYellow = 0;
		var ordRed = 0;

		var supplierRiskSummary = collectRiskBySupplier(enrichedSuppliers);
		var orderRiskSummary = collectOrderRiskStats(orders, supplierRiskSummary.riskBySupplierId);
		greens = supplierRiskSummary.greens;
		yellows = supplierRiskSummary.yellows;
		reds = supplierRiskSummary.reds;
		ordGreen = orderRiskSummary.greenCount;
		ordYellow = orderRiskSummary.yellowCount;
		ordRed = orderRiskSummary.redCount;

		var totalRisk = greens + yellows + reds;
		function tierPct(count, total) {
			return total ? round1((count / total) * 100) : 0;
		}
		var riskPie = [
			{ category: "Green (" + tierPct(greens, totalRisk) + "%)", value: greens },
			{ category: "Yellow (" + tierPct(yellows, totalRisk) + "%)", value: yellows },
			{ category: "Red (" + tierPct(reds, totalRisk) + "%)", value: reds }
		];

		var totalOrdTier = ordGreen + ordYellow + ordRed;
		var ordersRiskPie = [
			{ category: "Green (" + tierPct(ordGreen, totalOrdTier) + "%)", value: ordGreen },
			{ category: "Yellow (" + tierPct(ordYellow, totalOrdTier) + "%)", value: ordYellow },
			{ category: "Red (" + tierPct(ordRed, totalOrdTier) + "%)", value: ordRed }
		];

		var revGreen = orderRiskSummary.greenRevenue;
		var revYellow = orderRiskSummary.yellowRevenue;
		var revRed = orderRiskSummary.redRevenue;
		var totalRevTier = revGreen + revYellow + revRed;
		var lblRevG = textOrFallback(oBundle, "revTierGreen", "Green");
		var lblRevY = textOrFallback(oBundle, "revTierYellow", "Yellow");
		var lblRevR = textOrFallback(oBundle, "revTierRed", "Red");
		var revenueRiskPie = [
			{ category: lblRevG + " (" + tierPct(revGreen, totalRevTier) + "%)", value: round2(revGreen) },
			{ category: lblRevY + " (" + tierPct(revYellow, totalRevTier) + "%)", value: round2(revYellow) },
			{ category: lblRevR + " (" + tierPct(revRed, totalRevTier) + "%)", value: round2(revRed) }
		];

		var volatilityBubbles = (enrichedSuppliers || []).map(function (s) {
			var nmFull = String(s.supplierName || "");
			var oc = s.totalOrders || 0;
			var ad = round1(s.averagePaymentDelayDays || 0);
			var rev = round2(s.totalAmount || 0);
			var lblSup = textOrFallback(oBundle, "bubbleDimSupplier", "Supplier Name");
			var lblOrd = textOrFallback(oBundle, "bubbleMeasureOrders", "Total Orders");
			var lblRev = textOrFallback(oBundle, "bubbleMeasureRevenue", "Total Revenue");
			var lblDly = textOrFallback(oBundle, "bubbleMeasureAvgDelay", "Average Delay Days");
			return {
				supplier: nmFull,
				supplierId: s.supplierId,
				riskStatus: s.riskStatus,
				orderCount: oc,
				avgDelayDays: ad,
				revenue: rev,
				tooltipLine: lblSup + ": " + nmFull + "\n"
					+ lblOrd + ": " + oc + "\n"
					+ lblRev + ": " + rev + "\n"
					+ lblDly + ": " + ad
			};
		});

		var lblOn = textOrFallback(oBundle, "stackLegendOnTime", "On time");
		var lbl03 = textOrFallback(oBundle, "stackLegendLate03", "Late 0–3 d");
		var lbl310 = textOrFallback(oBundle, "stackLegendLate310", "Late 3–10 d");
		var lbl10 = textOrFallback(oBundle, "stackLegendLate10", "Late >10 d");

		var ordersStacked = (enrichedSuppliers || []).map(function (s) {
			var cOn = 0;
			var c03 = 0;
			var c310 = 0;
			var c10 = 0;
			(s.orders || []).forEach(function (o) {
				applyPaymentCategoryToOrder(o);
				switch (o.paymentStatusCategory) {
					case PAYMENT_STATUS.ON_TIME:
						cOn++;
						break;
					case PAYMENT_STATUS.LATE_0_3:
						c03++;
						break;
					case PAYMENT_STATUS.LATE_3_10:
						c310++;
						break;
					default:
						c10++;
						break;
				}
			});
			var tot = cOn + c03 + c310 + c10;
			return {
				supplier: s.supplierName,
				mOnTime: cOn,
				mLate03: c03,
				mLate310: c310,
				mLate10: c10,
				tooltipLine: s.supplierName + ": " + lblOn + " " + cOn + ", " + lbl03 + " " + c03 + ", " + lbl310 + " " + c310 + ", " + lbl10 + " " + c10 + " (" + tot + ")"
			};
		});

		var paySort = options.paymentPerfSort || "lateShareDesc";
		ordersStacked.sort(function (a, b) {
			var la = a.mLate03 + a.mLate310 + a.mLate10;
			var lb = b.mLate03 + b.mLate310 + b.mLate10;
			var ta = (a.mOnTime + la) || 1;
			var tb = (b.mOnTime + lb) || 1;
			switch (paySort) {
				case "onTimeDesc":
					return (b.mOnTime || 0) - (a.mOnTime || 0);
				case "onTimeAsc":
					return (a.mOnTime || 0) - (b.mOnTime || 0);
				case "late03Desc":
					return (b.mLate03 || 0) - (a.mLate03 || 0);
				case "late310Desc":
					return (b.mLate310 || 0) - (a.mLate310 || 0);
				case "late10Desc":
					return (b.mLate10 || 0) - (a.mLate10 || 0);
				case "supplierAsc":
					return String(a.supplier || "").localeCompare(String(b.supplier || ""));
				case "lateShareDesc":
				default:
					if (lb / tb !== la / ta) {
						return (lb / tb) - (la / ta);
					}
					return lb - la;
			}
		});

		var ordersStackedTotalCount = ordersStacked.length;

		var countryAgg = {};
		orders.forEach(function (o) {
			var grp = countryGroupFromOrder(o);
			var nk = grp.key;
			if (!countryAgg[nk]) {
				countryAgg[nk] = { total: 0, late: 0, label: grp.label };
			}
			countryAgg[nk].total++;
			var dd = typeof o.delayDays === "number" ? o.delayDays : 0;
			if (dd > 0) {
				countryAgg[nk].late++;
			}
		});

		var latePctByCountry = Object.keys(countryAgg).map(function (nk) {
			var countrySummary = countryAgg[nk];
			var countryLabel = countrySummary.label;
			var latePct = countrySummary.total ? Math.min(100, Math.max(0, round2((countrySummary.late / countrySummary.total) * 100))) : 0;
			var onTimePct = countrySummary.total ? Math.min(100, Math.max(0, round2(100 - latePct))) : 0;
			var selected = dashCountry && countryLabel === dashCountry;
			var dimmed = dashCountry && countryLabel !== dashCountry;
			return {
				country: countryLabel,
				onTimePct: onTimePct,
				latePct: latePct,
				totalOrders: countrySummary.total,
				lateOrders: countrySummary.late,
				onTimeOrders: countrySummary.total - countrySummary.late,
				selected: selected,
				dimmed: dimmed,
				tooltipLine: countryLabel + ": " + onTimePct + "% on-time, " + latePct + "% late (" + countrySummary.total + " orders)"
			};
		}).sort(function (a, b) {
			return b.latePct - a.latePct;
		});

		var suppliersForAvg = (enrichedSuppliers || []).filter(function (s) {
			return !dashCountry || s.country === dashCountry;
		});

		var avgDelayBySupplier = suppliersForAvg.map(function (s) {
			var lateOnly = (s.orders || []).filter(function (o) {
				return (o.delayDays || 0) > 0;
			});
			var sum = 0;
			lateOnly.forEach(function (o) {
				sum += o.delayDays || 0;
			});
			var avg = lateOnly.length ? round1(sum / lateOnly.length) : 0;
			return {
				supplier: s.supplierName,
				supplierId: s.supplierId,
				avgDelay: avg,
				tooltipLine: s.supplierName + ": avg delay " + avg + " d (late orders only)"
			};
		}).sort(function (a, b) {
			return (b.avgDelay || 0) - (a.avgDelay || 0);
		});

		return {
			riskPie: riskPie,
			ordersRiskPie: ordersRiskPie,
			revenueRiskPie: revenueRiskPie,
			ordersStacked: ordersStacked,
			ordersStackedFull: ordersStacked,
			ordersStackedDisplayCount: ordersStackedTotalCount,
			ordersStackedTotalCount: ordersStackedTotalCount,
			volatilityBubbles: volatilityBubbles,
			latePctByCountry: latePctByCountry,
			avgDelayBySupplier: avgDelayBySupplier
		};
	}

	function extractCountriesFromOrders(orders) {
		var labels = {};
		(orders || []).forEach(function (o) {
			var g = countryGroupFromOrder(o);
			if (g.key === "_unknown") {
				return;
			}
			if (!labels[g.key]) {
				labels[g.key] = g.label;
			}
		});
		return Object.keys(labels).map(function (k) {
			return labels[k];
		}).sort();
	}

	function rebuildSuppliersFromOrders(viewData, oBundle) {
		viewData.suppliers = buildSuppliersFromOrders(viewData.orders || []);
		viewData.suppliers.forEach(function (s) {
			enrichSupplier(s, oBundle);
		});
	}

	function recalculateAll(viewData, oBundle) {
		syncOrderCategories(viewData.orders);
		rebuildSuppliersFromOrders(viewData, oBundle);

		viewData.filteredSuppliers = applyFilters(viewData.suppliers, viewData.filterState || {});
		viewData.filteredSuppliers = sortSuppliers(
			viewData.filteredSuppliers,
			viewData.sortKey || "riskScore",
			!!viewData.sortDescending
		);

		var filteredOrders = filterOrdersForSuppliers(viewData.orders, viewData.filteredSuppliers);
		viewData.kpi = calculateKPIsFromOrders(filteredOrders, viewData.filteredSuppliers, oBundle);
		viewData.charts = calculateChartsData(filteredOrders, viewData.filteredSuppliers, {
			dashboardCountry: viewData.dashboardChartCountry || "",
			paymentPerfSort: viewData.dashboardPaymentPerfSort || "lateShareDesc"
		}, oBundle);
	}

	function recalculateDashboardOnly(viewData, oBundle) {
		syncOrderCategories(viewData.orders);
		rebuildSuppliersFromOrders(viewData, oBundle);

		viewData.kpi = calculateKPIsFromOrders(viewData.orders, viewData.suppliers, oBundle);
		viewData.charts = calculateChartsData(viewData.orders, viewData.suppliers, {
			dashboardCountry: viewData.dashboardChartCountry || "",
			paymentPerfSort: viewData.dashboardPaymentPerfSort || "lateShareDesc"
		}, oBundle);
	}

	function loadSuppliersFromJson() {
		return Promise.resolve({
			orders: generateTransactionalPortfolio()
		});
	}

	return {
		RISK: RISK,
		PAYMENT_STATUS: PAYMENT_STATUS,
		generateTransactionalPortfolio: generateTransactionalPortfolio,
		buildSuppliersFromOrders: buildSuppliersFromOrders,
		syncOrderCategories: syncOrderCategories,
		paymentCategoryFromDelay: paymentCategoryFromDelay,
		daysBetweenDueAndPayment: daysBetweenDueAndPayment,
		calculateSupplierMetrics: calculateSupplierMetrics,
		calculateRiskStatus: calculateRiskStatus,
		calculateKPIsFromOrders: calculateKPIsFromOrders,
		calculateChartsData: calculateChartsData,
		enrichSupplier: enrichSupplier,
		applyFilters: applyFilters,
		sortSuppliers: sortSuppliers,
		extractCountriesFromOrders: extractCountriesFromOrders,
		recalculateAll: recalculateAll,
		recalculateDashboardOnly: recalculateDashboardOnly,
		loadSuppliersFromJson: loadSuppliersFromJson
	};
});
