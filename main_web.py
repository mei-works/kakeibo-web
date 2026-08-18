from flask import Flask, render_template, request, jsonify

import csv

import os

from datetime import date

import json

app = Flask(__name__)

import matplotlib as plt
plt.rcParams["font.family"] = "Hiragino Sans"

# CSVファイルのパスを定数として定義
CSV_PATH = os.path.join(os.path.dirname(__file__),"data_web.csv") 
GOALS_PATH = os.path.join(os.path.dirname(__file__), "goals.json")

def load_data():

    data = {}

    with open (CSV_PATH, "r", encoding="utf-8") as file:
        r = csv.reader(file, delimiter="/") #csvデータを１行ずつ取り出す。
        next(r) #1行スキップ

        for row in r:
            # 4列未満の行はスキップ
            if len(row) < 4:
                print("列数エラー：スキップします")
                continue

            amount = int(row[2])
            category = row[1]
            type = row[3]

            month = row[0][:7]
            month = month.replace("-", "年", 1) + "月"

            # 日付が10文字以外はスキップ
            if len(row[0]) != 10:
                print("日付入力ミス：スキップします")
                continue

            if month not in data:
                data[month] = {"income": 0, "expence": 0, "categories": {}}

            #集計
            if type == "収入":
                data[month]["income"] += amount
            elif type == "積立":
                # 積立は支出として計上するがカテゴリーに記録
                data[month]["expence"] += amount
                if category not in data[month]["categories"]:
                    data[month]["categories"][category] = 0
                data[month]["categories"][category] += amount
            elif type == "積立引出":
            # 積立引出は支出にも積立残高にも影響しない（引出記録のみ）
                if "withdrawals" not in data[month]:
                    data[month]["withdrawals"] = {}
                if category not in data[month]["withdrawals"]:
                    data[month]["withdrawals"][category] = 0
                data[month]["withdrawals"][category] += amount
            else:
                # 通常支出
                data[month]["expence"] += amount
                if category not in data[month]["categories"]:
                    data[month]["categories"][category] = 0
                data[month]["categories"][category] += amount
            
    #取り出し・計算
    results = []

    for month in data:
        income = data[month]["income"]
        expence = data[month]["expence"]
        balance = income - expence

        if balance > 0:
            message = "今月の収支は黒字でした！来月も頑張りましょう👍"
        elif balance == 0:
            message = "今月の収支はちょうど０でした。来月はプラスになるように支出を工夫してみましょう！"
        else:
            message = "収支が赤字です。支出の項目を見直してみましょう"
        
        results.append({
        "month": month,
        "income": income,
        "expense": expence,
        "balance": balance,
        "message": message,
        "categories": data[month].get("categories", {})  # カテゴリ別支出を追加    
        })
    # 全期間のカテゴリ別支出を集計
    all_categories = {}
    for month in data:
        for cat, amt in data[month]["categories"].items():
            if cat not in all_categories:
                all_categories[cat] = 0
            all_categories[cat] += amt
    # 積立の累計を集計　
    savings = {}
    for month in data:
        # 積立を足す
        for cat, amt in data[month]["categories"].items():
            if cat.startswith("積立_"):
                if cat not in savings:
                    savings[cat] = 0
                savings[cat] += amt

        # 積立引出を引く
        for cat, amt in data[month].get("withdrawals", {}).items():
            if cat in savings:
                savings[cat] -= amt

    # goals.jsonから目標金額を読み込む
    try:
        with open(GOALS_PATH, "r", encoding="utf-8") as f:
            goals = json.load(f)
    except:
        goals = {}

    # 月を時系列順に並び替え
    results.sort(key=lambda x: x["month"].replace("年", "").replace("月", ""))

    print("savings:", savings)  
    print("goals:", goals)      
    return {
        "monthly": results,
        "all_categories": all_categories,
        "savings": savings,
        "goals": goals
    }
    # 積立の累計を集計
    savings = {}
    withdrawals = {}
    for month in data:
        for cat, amt in data[month]["categories"].items():
            # カテゴリー名が「積立_」で始まるものを積立として扱う
            if cat.startswith("積立_"):
                if cat not in savings:
                    savings[cat] = 0
                    withdrawals[cat] = 0
                savings[cat] += amt

    # goals.jsonから目標金額を読み込む
    try:
        with open(GOALS_PATH, "r", encoding="utf-8") as f:
            goals = json.load(f)
    except:
        goals = {}

    # 月を時系列順に並び替え
    results.sort(key=lambda x: x["month"])

    return {
    "monthly": results,
    "all_categories": all_categories,
    "savings": savings,
    "goals": goals
}
    
@app.route("/")
def home():
    result = load_data()
    return render_template("index.html",
                       data=result["monthly"],
                       all_categories=result["all_categories"],
                       savings=result["savings"],
                       goals=result["goals"],
                       today=date.today().isoformat())

@app.route("/add", methods=["POST"])
def add_entry():
    try:
        body     = request.get_json()
        amount   = int(body["amount"])
        category = body["category"].strip()
        type     = body["type"].strip()
        today    = body.get("date") or date.today().isoformat()

        if amount <= 0:
            return jsonify({"success": False, "error": "金額は1以上を入力してください"})
        if not category:
            return jsonify({"success": False, "error": "カテゴリーを入力してください"})
        if type not in ["収入", "支出","積立","積立引出"]:
            return jsonify({"success": False, "error": "収支タイプが不正です"})

        with open(CSV_PATH, "a", encoding="utf-8", newline="") as f:
            writer = csv.writer(f, delimiter="/")
            writer.writerow([today, category, amount, type])

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/set_goal", methods=["POST"])
def set_goal():
    try:
        body     = request.get_json()
        name     = body["name"].strip()
        amount   = int(body["amount"])

        if not name:
            return jsonify({"success": False, "error": "積立名を入力してください"})
        if amount <= 0:
            return jsonify({"success": False, "error": "目標金額は1以上を入力してください"})

        deadline = body.get("deadline", "")
        if not deadline:
            return jsonify({"success": False, "error": "達成目標月を入力してください"})

        # goals.jsonを読み込んで追記して保存
        try:
            with open(GOALS_PATH, "r", encoding="utf-8") as f:
                goals = json.load(f)
        except:
            goals = {}

        deadline = body.get("deadline", "")
        goals["積立_" + name] = {"amount": amount, "deadline": deadline}

        with open(GOALS_PATH, "w", encoding="utf-8") as f:
            json.dump(goals, f, ensure_ascii=False, indent=2)

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(debug=True, port=5001)
