/* Mr & Mrs Lifestyle — 3-day sample meal plan for the calorie calculator.
   Each dish is a base recipe; portions are scaled to the person's calorie target for that meal.
   Ingredient values: [name, amount, unit, kcal, protein_g, scales?] (kcal/protein are for the base amount). */
(function () {
  var SPLIT = [['Breakfast', 0.25], ['Lunch', 0.35], ['Snack', 0.10], ['Dinner', 0.30]];

  var DAYS = [
    [ // Day 1
      { name: 'Eggs & Potato Hash', ing: [
        ['eggs', 2, 'egg', 140, 12], ['egg whites', 100, 'g', 52, 11], ['boiled potatoes, pan-crisped', 150, 'g', 115, 3],
        ['olive oil', 1, 'tsp', 40, 0], ['cherry tomatoes', 100, 'g', 20, 1, false]] },
      { name: 'Butter Chicken & Basmati Rice', note: 'Lighter home-style version', ing: [
        ['chicken breast', 180, 'g', 198, 40], ['butter chicken sauce (light)', 100, 'g', 120, 2],
        ['cooked basmati rice', 150, 'g', 195, 4], ['cucumber & mint salad', 100, 'g', 15, 1, false]] },
      { name: 'Greek Yoghurt & Dates', ing: [
        ['0% Greek yoghurt', 170, 'g', 100, 17], ['Medjool dates', 2, 'piece', 130, 1]] },
      { name: 'Spaghetti Bolognese', ing: [
        ['spaghetti (dry weight)', 80, 'g', 285, 10], ['lean beef mince (5% fat)', 120, 'g', 165, 25],
        ['tomato & onion sauce', 150, 'g', 50, 2], ['parmesan', 10, 'g', 40, 4]] }
    ],
    [ // Day 2
      { name: 'Cornflakes Protein Bowl', ing: [
        ['cornflakes', 40, 'g', 150, 3], ['low-fat milk', 250, 'ml', 115, 9], ['whey protein', 1, 'scoop', 120, 24],
        ['banana', 1, 'piece', 90, 1]] },
      { name: 'Chicken Shawarma Plate (Light)', ing: [
        ['grilled chicken shawarma', 180, 'g', 300, 40], ['Arabic bread', 0.5, 'piece', 125, 4],
        ['hummus', 40, 'g', 70, 3], ['garlic sauce', 1, 'tsp', 35, 0], ['salad & pickles', 150, 'g', 30, 1, false]] },
      { name: 'Boiled Eggs & Apple', ing: [
        ['boiled eggs', 2, 'egg', 140, 12], ['apple', 1, 'piece', 95, 0]] },
      { name: 'Grilled Hammour, Rice & Veg', ing: [
        ['grilled hammour fillet', 200, 'g', 200, 42], ['cooked rice', 150, 'g', 195, 4],
        ['grilled vegetables', 150, 'g', 50, 3, false], ['olive oil', 1, 'tsp', 40, 0]] }
    ],
    [ // Day 3
      { name: 'Arabic Breakfast: Foul & Eggs', ing: [
        ['foul medames', 150, 'g', 165, 11], ['boiled eggs', 2, 'egg', 140, 12], ['Arabic bread', 0.5, 'piece', 125, 4],
        ['cucumber & tomato', 100, 'g', 20, 1, false]] },
      { name: 'Chicken Machboos (Home Style)', ing: [
        ['chicken breast', 180, 'g', 198, 40], ['spiced machboos rice (cooked)', 150, 'g', 210, 4],
        ['ghee', 1, 'tsp', 40, 0], ['tomato & onion', 100, 'g', 40, 1, false]] },
      { name: 'Protein Shake & Banana', ing: [
        ['whey protein (with water)', 1, 'scoop', 120, 24], ['banana', 1, 'piece', 90, 1]] },
      { name: 'Lean Beef Burger & Sweet Potato Wedges', ing: [
        ['lean beef patty (5% fat)', 150, 'g', 205, 32], ['burger bun', 1, 'piece', 150, 5], ['cheese slice', 1, 'piece', 60, 4],
        ['baked sweet potato wedges', 200, 'g', 170, 3], ['olive oil', 1, 'tsp', 40, 0], ['lettuce, tomato & pickles', 50, 'g', 10, 0, false]] }
    ]
  ];

  function roundAmt(a, unit) {
    if (unit === 'g' || unit === 'ml') return Math.max(10, Math.round(a / 10) * 10);
    if (unit === 'egg') return Math.max(1, Math.round(a));
    return Math.max(0.5, Math.round(a * 2) / 2); // scoop, tsp, piece
  }
  function fmtNum(a) {
    var w = Math.floor(a), h = a - w > 0.25 ? '½' : '';
    return (w ? w : '') + h || '½';
  }
  function fmtIng(name, a, unit) {
    if (unit === 'g' || unit === 'ml') return a + ' ' + unit + ' ' + name;
    if (unit === 'egg') return a + ' ' + (a === 1 ? name.replace(/s$/, '').replace('eggs', 'egg') : name);
    if (unit === 'scoop') return fmtNum(a) + ' scoop' + (a > 1 ? 's' : '') + ' ' + name;
    if (unit === 'tsp') return fmtNum(a) + ' tsp ' + name;
    return fmtNum(a) + ' ' + name;
  }
  function esc(s) { return String(s).replace(/[<>&"]/g, ''); }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function isProt(i) { return i[3] > 0 && i[4] * 4 / i[3] >= 0.3; }

  // Scale protein foods (fp) and the rest (fo) separately so the meal hits both its calorie and protein share.
  function buildMeal(dish, target, ptarget) {
    var Kp = 0, Pp = 0, Ko = 0, Po = 0, Kf = 0, Pf = 0;
    dish.ing.forEach(function (i) {
      if (i[5] === false) { Kf += i[3]; Pf += i[4]; }
      else if (isProt(i)) { Kp += i[3]; Pp += i[4]; }
      else { Ko += i[3]; Po += i[4]; }
    });
    var K = target - Kf, P = (ptarget || 0) - Pf, fp, fo;
    var det = Pp * Ko - Po * Kp;
    if (ptarget && Kp && Ko && Math.abs(det) > 1e-6) {
      fp = (P * Ko - Po * K) / det;
      fp = clamp(fp, 0.6, 2.0);
    } else {
      fp = K / Math.max(Kp + Ko, 1);
    }
    fo = Ko ? (K - fp * Kp) / Ko : 1;
    var fo2 = clamp(fo, 0.6, 3.5);
    if (fo2 !== fo && Kp) fp = clamp((K - fo2 * Ko) / Kp, 0.5, 2.5); // calories win over the protein target
    fo = fo2;
    if (!Ko) fp = clamp(K / Math.max(Kp, 1), 0.5, 2.5);
    var kcal = 0, prot = 0, items = [];
    dish.ing.forEach(function (i) {
      var scale = i[5] !== false;
      var f = isProt(i) ? fp : fo;
      var amt = scale ? roundAmt(i[1] * f, i[2]) : i[1];
      var r = amt / i[1];
      kcal += i[3] * r; prot += i[4] * r;
      items.push(fmtIng(i[0], amt, i[2]));
    });
    return { kcal: Math.round(kcal / 10) * 10, p: Math.round(prot), items: items };
  }

  window.mmPlanHTML = function (k, p, name) {
    k = k || 2000;
    var gold = '#c9a84c', tabs = '', panels = '';
    DAYS.forEach(function (day, d) {
      var on = d === 0, tk = 0, tp = 0, rows = '';
      day.forEach(function (dish, m) {
        var slot = SPLIT[m], meal = buildMeal(dish, k * slot[1], p * slot[1]);
        tk += meal.kcal; tp += meal.p;
        rows += '<div style="padding:.85rem 0;border-bottom:1px solid rgba(255,255,255,.08)">' +
          '<div style="display:flex;justify-content:space-between;gap:.75rem;align-items:baseline;flex-wrap:wrap">' +
          '<div><div style="font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:' + gold + ';font-weight:700">' + slot[0] + '</div>' +
          '<div style="font-weight:700;font-size:1rem;margin-top:.15rem">' + dish.name + '</div></div>' +
          '<div style="color:' + gold + ';font-size:.85rem;white-space:nowrap">~' + meal.kcal + ' kcal · ' + meal.p + 'g protein</div></div>' +
          '<div style="font-size:.84rem;color:rgba(255,255,255,.68);margin-top:.35rem;line-height:1.55">' + meal.items.join(' · ') + '</div></div>';
      });
      tabs += '<button type="button" data-d="' + d + '" onclick="mmPlanTab(' + d + ')" style="flex:1;padding:.65rem .5rem;border:1px solid ' + (on ? gold : 'rgba(255,255,255,.15)') + ';background:' + (on ? gold : 'transparent') + ';color:' + (on ? '#0a0a0a' : '#fff') + ';border-radius:6px;font-weight:700;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;font-family:inherit">Day ' + (d + 1) + '</button>';
      panels += '<div class="mm-day" data-d="' + d + '" style="display:' + (on ? 'block' : 'none') + '">' + rows +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:.75rem;padding:.8rem 0 0;font-size:.86rem;font-weight:700"><span style="white-space:nowrap">Day ' + (d + 1) + ' total</span><span style="color:' + gold + ';text-align:right">~' + tk.toLocaleString('en-US') + ' kcal · ' + tp + 'g protein</span></div></div>';
    });
    return '<div style="font-weight:700;font-size:1.05rem;margin-bottom:.35rem">✅ Thanks ' + esc(name) + ', here\'s your 3-day meal plan</div>' +
      '<p style="font-size:.85rem;color:rgba(255,255,255,.6);margin:0 0 1rem;line-height:1.55">Built around ' + k.toLocaleString('en-US') + ' kcal a day' + (p ? ' and about ' + p + 'g protein' : '') + '. Portions are already scaled to your numbers. Screenshot each day for later.</p>' +
      '<div style="display:flex;gap:.5rem;margin-bottom:.4rem">' + tabs + '</div>' + panels +
      '<p style="font-size:.75rem;color:rgba(255,255,255,.45);margin:.9rem 0 0;line-height:1.5">Weights are cooked unless stated. Values are estimates. Swap any meal for another day\'s meal in the same slot.</p>';
  };

  window.mmPlanTab = function (d) {
    document.querySelectorAll('.mm-day').forEach(function (el) { el.style.display = +el.dataset.d === d ? 'block' : 'none'; });
    document.querySelectorAll('#mpPlan button[data-d]').forEach(function (b) {
      var on = +b.dataset.d === d;
      b.style.background = on ? '#c9a84c' : 'transparent'; b.style.color = on ? '#0a0a0a' : '#fff'; b.style.borderColor = on ? '#c9a84c' : 'rgba(255,255,255,.15)';
    });
  };
})();
