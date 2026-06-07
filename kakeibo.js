/**
 * kakeibo.js — 家計簿アプリ用スクリプト
 *
 * やること：
 * 1. 収支バーの幅を、収入・支出の最大値を基準にアニメーション表示する
 * 2. 収支がプラス/マイナス/ゼロでカードに色クラスを付与する
 */

document.addEventListener("DOMContentLoaded", function () {

  // ── 1. 全カードを取得 ──────────────────────────────────────
  const cards = document.querySelectorAll(".month-card");

  cards.forEach(function (card) {

    // ── 2. バー幅の計算 ──────────────────────────────────────
    // data-* 属性から数値を読み取る（HTML側で data-income, data-expense を渡す）
    const income  = parseInt(card.dataset.income,  10) || 0;
    const expense = parseInt(card.dataset.expense, 10) || 0;
    const max     = Math.max(income, expense, 1); // 最小を1に設定

    // 収入バーと支出バーのパーセント幅（最大を100%とする）
    const incPct = Math.round((income  / max) * 100);
    const expPct = Math.round((expense / max) * 100);

    // ── 3. バー要素に幅をセット（アニメーションはCSSのtransitionで動く）──
    // ページ読み込み直後は width: 0 → 少し遅延してセットすることでアニメーションが動く
    const incBar = card.querySelector(".bar-fill.income");
    const expBar = card.querySelector(".bar-fill.expense");

    // 最初に0%にしてから変更すると、CSS transitionが作動する
    if (incBar) {
      incBar.style.width = "0%";
      requestAnimationFrame(function () {
        // 1フレーム後にセット → ブラウザが変化を検知してtransitionが動く
        requestAnimationFrame(function () {
          incBar.style.width = incPct + "%";
        });
      });
    }

    if (expBar) {
      expBar.style.width = "0%";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          expBar.style.width = expPct + "%";
        });
      });
    }

    // ── 4. 収支のプラス/マイナス/ゼロ判定 ──────────────────────
    const balance = income - expense;
    const balanceEl = card.querySelector(".balance-value");

    if (balanceEl) {
      if (balance > 0) {
        balanceEl.classList.add("plus");
      } else if (balance < 0) {
        balanceEl.classList.add("minus");
      } else {
        balanceEl.classList.add("zero");
      }
    }

  }); // forEach end

}); // DOMContentLoaded end

// ===== グラフ描画 =====

// ===== 月別収支バランス棒グラフ =====
const barCanvas = document.getElementById("barChart");
if (barCanvas) {
  const monthly = JSON.parse(barCanvas.dataset.monthly || "[]");
  const labels   = monthly.map(d => d.month);
  const incomes  = monthly.map(d => d.income);
  const expenses = monthly.map(d => d.expense);

  new Chart(barCanvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "収入",
          data: incomes,
          backgroundColor: "#1D4ED8",
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "支出",
          data: expenses,
          backgroundColor: "#EA580C",
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top", labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ": ¥" + ctx.raw.toLocaleString("ja-JP")
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: val => {
              if (val >= 10000) return "¥" + (val / 10000) + "万";
              return "¥" + val;
            },
            font: { size: 9 },
            maxTicksLimit: 4
          },
          grid: { color: "#eeecea" }
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

// ===== 全期間支出内訳円グラフ =====
const pieCanvas = document.getElementById("pieChart");
if (pieCanvas) {
  const raw    = JSON.parse(pieCanvas.dataset.categories || "{}");
  const labels = Object.keys(raw);
  const values = Object.values(raw);

  if (labels.length > 0) {
    const colors = [
      "#EA580C", "#F97316", "#78716C",
      "#D97706", "#A16207", "#FB923C",
      "#888780"
    ];

    new Chart(pieCanvas, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 1,
          borderColor: "#ffffff"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { size: 11 }, padding: 10, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ctx.label + ": ¥" + ctx.raw.toLocaleString("ja-JP")
            }
          }
        }
      }
    });
  }
}