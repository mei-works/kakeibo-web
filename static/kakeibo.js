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
    const max     = Math.max(income, expense, 1); // 0除算を防ぐため最小1

    // 収入バーと支出バーのパーセント幅（最大を100%とする）
    const incPct = Math.round((income  / max) * 100);
    const expPct = Math.round((expense / max) * 100);

    // ── 3. バー要素に幅をセット（アニメーションはCSSのtransitionで動く）──
    // ページ読み込み直後は width: 0 → 少し遅延してセットすることでアニメーションが動く
    const incBar = card.querySelector(".bar-fill.income");
    const expBar = card.querySelector(".bar-fill.expense");

    // widthを0にしてからセットすることでCSS transitionが発火する
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