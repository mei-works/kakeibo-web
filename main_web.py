
from flask import Flask, render_template

import csv

import os

app = Flask(__name__)

import matplotlib as plt
plt.rcParams["font.family"] = "Hiragino Sans"
def load_data():
    current_dir = os.path.dirname(__file__)
    file_path = os.path.join(current_dir, "data_web.csv")

    data = {}

    with open (file_path, "r", encoding="utf-8") as file:
        r = csv.reader(file, delimiter="/") #csvデータを１行ずつ取り出す。
        next(r) #1行スキップ

        for row in r:
            amount = int(row[2]) #金額(３行目)
            category = row[1] #項目(2行目)
            type = row[3] #区分(4行目)
        
            month = row[0][:7]
            month = month.replace("-", "年", 1) + "月"

            # 入力エラー対策
            if len(row[0]) != 10:
                print("日付入力ミス")

            if month not in data:
                data[month] = {"income": 0, "expence": 0, "categories": {}}

            #集計
            if type == "収入":
                data[month]["income"]+= amount
            else: # 区分が"支出"の場合
                data[month]["expence"]+= amount
                # カテゴリ別に支出を集計
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

        return {"monthly": results, "all_categories": all_categories}   
    return results
    
@app.route("/")
def home():
    result = load_data()
    return render_template("index.html",
                           data=result["monthly"],
                           all_categories=result["all_categories"])
if __name__ == "__main__":
    app.run(debug=True)
