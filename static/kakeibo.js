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
          backgroundColor: "#1E40AF",
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "支出",
          data: expenses,
          backgroundColor: "#CBD5E1",
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
  "#93C5FD", // ① ライトブルー
  "#0EA5E9", // ② スカイブルー
  "#6366F1", // ③ インディゴ
  "#94A3B8", // ④ スレートグレー（淡）
  "#C4B5FD", // ⑤ ライトバイオレット
  "#67E8F9", // ⑥ ライトシアン
  "#475569", // ⑦ スレートグレー
  "#BFDBFE", // ⑧ ペールブルー
  "#94A3B8"  // ⑨ ライトグレー
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

// ===== 入力フォームの送信処理 =====
const saveBtn = document.getElementById("saveBtn");
const msgEl   = document.getElementById("formMessage");

if (saveBtn) {
  saveBtn.addEventListener("click", async function () {

    const type     = document.getElementById("inputType").value;
    const category = document.getElementById("inputCategory").value.trim();
    const amount   = document.getElementById("inputAmount").value;
    const dateVal = document.getElementById("inputDate").value;

    if (!dateVal) {
      showMessage("日付を入力してください", "error");
      return;
    }
    if (!category) {
      showMessage("カテゴリーを入力してください", "error");
      return;
    }
    if (!amount || parseInt(amount) <= 0) {
      showMessage("金額を正しく入力してください", "error");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "保存中...";

    try {
      const response = await fetch("/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, category, amount: parseInt(amount), date: dateVal })
      });

      const result = await response.json();

      if (result.success) {
        showMessage("保存しました！画面を更新します…", "success");
        setTimeout(() => location.reload(), 1000);
      } else {
        showMessage("エラー: " + result.error, "error");
        saveBtn.disabled = false;
        saveBtn.textContent = "保存する";
      }

    } catch (e) {
      showMessage("通信エラーが発生しました", "error");
      saveBtn.disabled = false;
      saveBtn.textContent = "保存する";
    }
  });
}

function showMessage(text, type) {
  msgEl.textContent = text;
  msgEl.className   = "form-message " + type;
}

// ===== 積立目標設定フォームの送信処理 =====
const goalBtn = document.getElementById("goalBtn");
const goalMsg = document.getElementById("goalMessage");

if (goalBtn) {
  goalBtn.addEventListener("click", async function () {
    const name   = document.getElementById("goalName").value.trim();
    const amount = document.getElementById("goalAmount").value;
    const deadline = document.getElementById("goalDeadline").value;

    if (!name) {
      goalMsg.textContent = "積立名を入力してください";
      goalMsg.className = "form-message error";
      return;
    }
    if (!deadline) {
      goalMsg.textContent = "達成目標月を入力してください";
      goalMsg.className = "form-message error";
      return;
    }

    if (!amount || parseInt(amount) <= 0) {
      goalMsg.textContent = "目標金額を正しく入力してください";
      goalMsg.className = "form-message error";
      return;
    }

    goalBtn.disabled = true;
    goalBtn.textContent = "保存中...";

    try {
      const deadline = document.getElementById("goalDeadline").value;
      const response = await fetch("/set_goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount: parseInt(amount), deadline })
      });

      const result = await response.json();

      if (result.success) {
        goalMsg.textContent = "目標を設定しました！画面を更新します…";
        goalMsg.className = "form-message success";
        setTimeout(() => location.reload(), 1000);
      } else {
        goalMsg.textContent = "エラー: " + result.error;
        goalMsg.className = "form-message error";
        goalBtn.disabled = false;
        goalBtn.textContent = "目標を設定";
      }
    } catch (e) {
      goalMsg.textContent = "通信エラーが発生しました";
      goalMsg.className = "form-message error";
      goalBtn.disabled = false;
      goalBtn.textContent = "目標を設定";
    }
  });
}

// ===== プログレスアイコンのアニメーション =====
document.querySelectorAll(".savings-card").forEach(function(card) {
  const icon = card.querySelector(".progress-icon");
  if (!icon) return;

  const pct = parseInt(card.dataset.saved) / parseInt(card.dataset.goal) * 100;
  if (isNaN(pct)) return;

  icon.style.left = "0%";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    icon.style.left = Math.min(pct, 97) + "%";
  }));
});

// ===== 月々の必要積立額を計算 =====
document.querySelectorAll(".savings-card").forEach(function(card, index) {
  const monthlyEl = card.querySelector(".savings-monthly");
  if (!monthlyEl) return;

  // data属性から値を取得（HTMLで渡す）
  const saved    = parseInt(card.dataset.saved)    || 0;
  const goal     = parseInt(card.dataset.goal)     || 0;
  const deadline = card.dataset.deadline           || "";

  if (!deadline || goal <= 0) return;

  // 残り月数を計算
  const now          = new Date();
  const deadlineDate = new Date(deadline + "-01");
  const diffMonths   = (deadlineDate.getFullYear() - now.getFullYear()) * 12
                     + (deadlineDate.getMonth() - now.getMonth());

  if (diffMonths <= 0) {
    monthlyEl.textContent = "達成目標月を過ぎています";
    return;
  }

  const remaining     = goal - saved;
  const monthlyNeeded = Math.ceil(remaining / diffMonths);

  if (remaining <= 0) {
    monthlyEl.textContent = "🎉 目標達成！";
  } else {
    monthlyEl.textContent = 
      "残り" + diffMonths + "ヶ月・月々 ¥" + monthlyNeeded.toLocaleString("ja-JP") + " 必要";
  }
});
