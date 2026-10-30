# Builds tracker/foods-db.js (the food list for the tracker's food log) from foods.py + common staples per 100 g.
# Run from repo root:  python3 _tools/food/tracker_db.py
import os, re, sys, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, '_tools', 'food'))
import foods

# Typical values per 100 g (or 100 ml), USDA-style averages. [name, arabic, kcal, protein, carbs, fat, unit, keywords]
STAPLES = [
 ['Basmati rice, cooked', 'رز بسمتي مطبوخ', 121, 3.5, 25, 0.4, 'g', 'rice basmati ارز رز بسمتي'],
 ['Pasta, cooked', 'باستا مطبوخة', 158, 5.8, 31, 0.9, 'g', 'pasta spaghetti penne معكرونة'],
 ['Quinoa, cooked', 'كينوا مطبوخة', 120, 4.4, 21, 1.9, 'g', 'quinoa كينوا'],
 ['Oats, dry', 'شوفان', 379, 13, 68, 6.5, 'g', 'oats oatmeal شوفان'],
 ['Wholemeal bread', 'خبز أسمر', 252, 12.5, 43, 3.5, 'g', 'bread toast خبز'],
 ['Arabic bread (khubz)', 'خبز عربي', 275, 9, 55, 1.2, 'g', 'bread pita khubz خبز عربي'],
 ['Potato, boiled', 'بطاطا مسلوقة', 87, 1.9, 20, 0.1, 'g', 'potato بطاطا بطاطس'],
 ['Sweet potato, baked', 'بطاطا حلوة مشوية', 90, 2, 21, 0.2, 'g', 'sweet potato بطاطا حلوة'],
 ['Chicken breast, grilled (skinless)', 'صدر دجاج مشوي', 165, 31, 0, 3.6, 'g', 'chicken breast دجاج صدر'],
 ['Chicken thigh, cooked (skinless)', 'فخذ دجاج مطبوخ', 209, 26, 0, 10.9, 'g', 'chicken thigh دجاج فخذ'],
 ['Lean beef mince (5% fat), cooked', 'لحم مفروم قليل الدهن مطبوخ', 170, 26, 0, 7, 'g', 'beef mince minced meat لحم مفروم'],
 ['Beef steak (sirloin), grilled', 'ستيك لحم مشوي', 200, 28, 0, 9, 'g', 'steak beef ستيك لحم'],
 ['Lamb, lean, cooked', 'لحم غنم مطبوخ', 230, 26, 0, 14, 'g', 'lamb mutton لحم غنم'],
 ['Salmon, cooked', 'سلمون مطبوخ', 206, 22, 0, 12.5, 'g', 'salmon fish سلمون سمك'],
 ['White fish (hammour, cod), cooked', 'سمك أبيض مطبوخ', 105, 23, 0, 1, 'g', 'fish hammour cod سمك هامور'],
 ['Shrimp / prawns, cooked', 'روبيان مطبوخ', 99, 24, 0.2, 0.3, 'g', 'shrimp prawns روبيان جمبري'],
 ['Tuna in water, drained', 'تونة بالماء', 116, 26, 0, 0.8, 'g', 'tuna تونة'],
 ['Turkey breast slices', 'شرائح صدر رومي', 104, 17, 4, 2, 'g', 'turkey رومي'],
 ['Whole egg', 'بيض كامل', 143, 12.6, 0.7, 9.5, 'g', 'egg eggs بيض'],
 ['Egg whites', 'بياض البيض', 52, 11, 0.7, 0.2, 'g', 'egg white بياض بيض'],
 ['Greek yoghurt, 0% fat', 'زبادي يوناني خالي الدسم', 59, 10, 3.6, 0.4, 'g', 'greek yogurt yoghurt زبادي يوناني'],
 ['Greek yoghurt, full fat', 'زبادي يوناني كامل الدسم', 97, 9, 4, 5, 'g', 'greek yogurt yoghurt زبادي يوناني'],
 ['Cottage cheese, low fat', 'جبن قريش قليل الدسم', 81, 10.5, 4.8, 2.3, 'g', 'cottage cheese جبن قريش'],
 ['Low-fat milk (1.5%)', 'حليب قليل الدسم', 46, 3.4, 4.9, 1.5, 'ml', 'milk حليب'],
 ['Laban, low fat', 'لبن قليل الدسم', 38, 3.2, 4.4, 1, 'ml', 'laban لبن'],
 ['Feta cheese', 'جبنة فيتا', 264, 14, 4, 21, 'g', 'feta cheese جبن فيتا'],
 ['Halloumi', 'حلومي', 321, 21, 2, 26, 'g', 'halloumi حلوم'],
 ['Cheddar cheese', 'جبنة شيدر', 403, 25, 1.3, 33, 'g', 'cheddar cheese جبن شيدر'],
 ['Labneh', 'لبنة', 160, 7, 5, 12, 'g', 'labneh لبنة'],
 ['Hummus', 'حمص', 166, 8, 14, 10, 'g', 'hummus حمص'],
 ['Lentils, cooked', 'عدس مطبوخ', 116, 9, 20, 0.4, 'g', 'lentils عدس'],
 ['Chickpeas, cooked', 'حمص حب مطبوخ', 164, 8.9, 27, 2.6, 'g', 'chickpeas حمص'],
 ['Whey protein powder', 'بروتين واي', 400, 80, 8, 6, 'g', 'whey protein بروتين'],
 ['Olive oil', 'زيت زيتون', 884, 0, 0, 100, 'g', 'olive oil زيت زيتون'],
 ['Butter', 'زبدة', 717, 0.9, 0.1, 81, 'g', 'butter زبدة'],
 ['Peanut butter', 'زبدة الفول السوداني', 588, 25, 20, 50, 'g', 'peanut butter زبدة فول سوداني'],
 ['Almonds', 'لوز', 579, 21, 22, 50, 'g', 'almonds nuts لوز مكسرات'],
 ['Walnuts', 'جوز', 654, 15, 14, 65, 'g', 'walnuts nuts جوز عين جمل'],
 ['Dates', 'تمر', 282, 2.5, 75, 0.4, 'g', 'dates تمر'],
 ['Banana', 'موز', 89, 1.1, 23, 0.3, 'g', 'banana موز'],
 ['Apple', 'تفاح', 52, 0.3, 14, 0.2, 'g', 'apple تفاح'],
 ['Orange', 'برتقال', 47, 0.9, 12, 0.1, 'g', 'orange برتقال'],
 ['Strawberries', 'فراولة', 32, 0.7, 7.7, 0.3, 'g', 'strawberry فراولة'],
 ['Blueberries', 'توت أزرق', 57, 0.7, 14, 0.3, 'g', 'blueberry توت'],
 ['Avocado', 'أفوكادو', 160, 2, 9, 15, 'g', 'avocado افوكادو'],
 ['Broccoli', 'بروكلي', 35, 2.4, 7, 0.4, 'g', 'broccoli بروكلي'],
 ['Mixed salad / leaves', 'سلطة خضراء', 17, 1.3, 3, 0.2, 'g', 'salad lettuce سلطة خس'],
 ['Tomato', 'طماطم', 18, 0.9, 3.9, 0.2, 'g', 'tomato طماطم بندورة'],
 ['Cucumber', 'خيار', 15, 0.7, 3.6, 0.1, 'g', 'cucumber خيار'],
 ['Honey', 'عسل', 304, 0.3, 82, 0, 'g', 'honey عسل'],
 ['Sugar', 'سكر', 387, 0, 100, 0, 'g', 'sugar سكر'],
 ['Dark chocolate (70%)', 'شوكولاتة داكنة', 598, 7.8, 46, 43, 'g', 'dark chocolate شوكولاتة'],
]

def grams(portion):
    if '+' in portion or ' with ' in portion: return None
    m = re.search(r'(\d+)\s*(g|ml)\b', portion)
    return int(m.group(1)) if m else None

rows = []
for n, ar, k, p, c, f, unit, kw in STAPLES:
    rows.append([n, ar, '100 ' + unit, 100, unit, k, p, c, f, kw])
for f in foods.FOODS:
    g = grams(f['portion'])
    unit = 'ml' if g and re.search(r'\d+\s*ml\b', f['portion']) else 'g'
    rows.append([f['en'], f['ar'], f['portion'], g, unit if g else 'portion', f['kcal'], f['p'], f['c'], f['f'], f.get('kw', '')])

out = ('/* Generated by _tools/food/tracker_db.py: do not edit by hand.\n'
       '   [name, arabic, portion label, grams in that portion or null, unit (g, ml or portion), kcal, protein, carbs, fat, keywords]\n'
       '   Staples are per 100 g/ml; the rest are typical Dubai portions from the Dubai Food Calories guide. */\n'
       'window.MM_FOODS = ' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(os.path.join(ROOT, 'tracker', 'foods-db.js'), 'w', encoding='utf-8').write(out)
print(len(rows), 'foods', len(out) // 1024, 'KB')
