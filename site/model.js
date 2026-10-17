// Port of the 02_Cash_Flow sheet in Cobot_ROI_Model_v0.2.xlsx.
// Values must reconcile with the workbook (see README "Scenario results").
(function (root) {
  const SCENARIOS = {
    downside: {
      horizon: 5, discount: 0.10, tax: 0.206, depYears: 5,
      shifts: 1, days: 225, hours: 7.2, operators: 1,
      realization: 0.45, uptime: 0.85, laborInfl: 0.02, laborCost: 390,
      carton: 12, effector: 5, payload: 20, requiredRate: 220, designRate: 230, powerKw: 0.75,
      capexItems: [750000, 300000, 250000, 500000, 100000], contingency: 0.15,
      maintPct: 0.07, service: 45000, elecPrice: 2.0, opexInfl: 0.03, salvagePct: 0, otherBenefit: 0,
    },
    base: {
      horizon: 5, discount: 0.08, tax: 0.206, depYears: 5,
      shifts: 2, days: 240, hours: 7.5, operators: 1,
      realization: 0.65, uptime: 0.92, laborInfl: 0.03, laborCost: 450,
      carton: 12, effector: 5, payload: 20, requiredRate: 220, designRate: 250, powerKw: 0.5,
      capexItems: [650000, 250000, 200000, 400000, 75000], contingency: 0.10,
      maintPct: 0.05, service: 30000, elecPrice: 1.5, opexInfl: 0.02, salvagePct: 0.05, otherBenefit: 0,
    },
    upside: {
      horizon: 5, discount: 0.06, tax: 0.206, depYears: 5,
      shifts: 3, days: 250, hours: 7.7, operators: 1,
      realization: 0.85, uptime: 0.96, laborInfl: 0.04, laborCost: 510,
      carton: 12, effector: 5, payload: 20, requiredRate: 220, designRate: 280, powerKw: 0.3,
      capexItems: [600000, 220000, 160000, 300000, 50000], contingency: 0.05,
      maintPct: 0.04, service: 20000, elecPrice: 1.0, opexInfl: 0.01, salvagePct: 0.10, otherBenefit: 0,
    },
  };

  function irr(flows) {
    const npvAt = (r) => flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 10;
    if (npvAt(lo) * npvAt(hi) > 0) return null;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (npvAt(lo) * npvAt(mid) <= 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  function run(a) {
    const base = a.capexItems.reduce((s, v) => s + v, 0);
    const capex = base * (1 + a.contingency);
    const hours = a.shifts * a.days * a.hours * a.operators;
    const fcf = [-capex];
    let year1Savings = 0;
    for (let y = 1; y <= a.horizon; y++) {
      const g = Math.pow(1 + a.opexInfl, y - 1);
      const savings = hours * a.laborCost * Math.pow(1 + a.laborInfl, y - 1) * a.realization * a.uptime;
      if (y === 1) year1Savings = savings;
      const benefits = savings + a.otherBenefit * g;
      const opex = capex * a.maintPct * g + a.service * g
        + a.shifts * a.days * a.hours * a.powerKw * a.elecPrice * g;
      const ebitda = benefits - opex;
      const ebit = ebitda - capex / a.depYears;
      const tax = Math.max(0, ebit * a.tax);
      const salvage = y === a.horizon ? capex * a.salvagePct * (1 - a.tax) : 0;
      fcf.push(ebitda - tax + salvage);
    }
    const npv = fcf.reduce((s, f, t) => s + f / Math.pow(1 + a.discount, t), 0);
    const cumulative = [];
    fcf.reduce((s, f) => { cumulative.push(s + f); return s + f; }, 0);
    let payback = null;
    for (let t = 1; t < cumulative.length; t++) {
      if (cumulative[t] >= 0) { payback = t - 1 + Math.abs(cumulative[t - 1]) / fcf[t]; break; }
    }
    const rate = irr(fcf);
    const payloadHeadroom = a.payload - a.carton - a.effector;
    const throughputHeadroom = a.designRate / a.requiredRate - 1;
    let decision;
    if (npv <= 0) decision = 'RETAIN MANUAL';
    else if (rate !== null && rate > a.discount && payback !== null && payback <= 3
      && payloadHeadroom >= 0 && throughputHeadroom >= 0) decision = 'INVEST NOW';
    else decision = 'RUN PILOT';
    return {
      capex, hours, fcf, cumulative, npv, irr: rate, payback, year1Savings,
      roi: fcf.reduce((s, f) => s + f, 0) / capex,
      payloadHeadroom, throughputHeadroom, decision,
    };
  }

  root.CobotModel = { SCENARIOS, run };
  if (typeof module !== 'undefined') module.exports = root.CobotModel;
})(typeof window !== 'undefined' ? window : globalThis);
