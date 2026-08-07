(function () {
  var dataEl = document.getElementById("quiz-data");
  if (!dataEl) return;
  var exam = JSON.parse(dataEl.textContent);
  var questions = exam.questions;
  var idx = 0;
  var score = 0;
  var answered = false;

  var root = document.getElementById("quiz-root");

  function render() {
    if (idx >= questions.length) {
      renderResult();
      return;
    }
    answered = false;
    var q = questions[idx];
    var pct = Math.round((idx / questions.length) * 100);

    var html = "";
    html += '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="card">';
    html += '<div class="q-meta"><span>問題 ' + (idx + 1) + ' / ' + questions.length + '</span><span>正解 ' + score + '</span></div>';
    html += '<p class="q-text">' + escapeHtml(q.q) + '</p>';
    html += '<div id="choices">';
    q.choices.forEach(function (c, i) {
      html += '<button class="choice" data-i="' + i + '">' + escapeHtml(c) + '</button>';
    });
    html += '</div>';
    html += '<div class="explain" id="explain">' + escapeHtml(q.explanation || "") + '</div>';
    html += '<button class="next-btn" id="nextBtn">次の問題へ</button>';
    html += '</div>';
    root.innerHTML = html;

    var buttons = root.querySelectorAll(".choice");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        var chosen = parseInt(btn.getAttribute("data-i"), 10);
        var correct = q.answer;
        buttons.forEach(function (b) { b.setAttribute("disabled", "disabled"); });
        if (chosen === correct) {
          btn.classList.add("correct");
          score++;
        } else {
          btn.classList.add("wrong");
          buttons[correct].classList.add("correct");
        }
        var ex = document.getElementById("explain");
        if (ex.textContent.trim()) ex.classList.add("show");
        var nb = document.getElementById("nextBtn");
        nb.classList.add("show");
        nb.textContent = idx + 1 >= questions.length ? "結果を見る" : "次の問題へ";
        nb.addEventListener("click", function () {
          idx++;
          render();
        });
      });
    });
  }

  function renderResult() {
    var pct = Math.round((score / questions.length) * 100);
    var shareText = encodeURIComponent(
      exam.shortTitle + "の練習問題で " + score + "/" + questions.length + "問(" + pct + "%)正解しました！ #" + exam.shortTitle
    );
    var url = encodeURIComponent(location.href);
    var html = "";
    html += '<div class="card result">';
    html += '<h2>結果発表</h2>';
    html += '<div class="score">' + score + '<small> / ' + questions.length + '</small></div>';
    html += '<p style="color:var(--text-dim)">正答率 ' + pct + '%</p>';
    html += '<div class="share-row">';
    html += '<button class="primary" id="retryBtn">もう一度挑戦</button>';
    html += '<a class="primary" target="_blank" rel="noopener" href="https://threads.net/intent/post?text=' + shareText + '%20' + url + '">結果をThreadsでシェア</a>';
    html += '</div></div>';
    root.innerHTML = html;
    document.getElementById("retryBtn").addEventListener("click", function () {
      idx = 0;
      score = 0;
      render();
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  render();
})();
