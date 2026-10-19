# Sample CSV

`foods_example.csv` is an example for the **Upload CSV** button on the Food Library page.

Columns:

| Column | Required | Notes |
| --- | --- | --- |
| `name_en`, `name_es`, `name_he` | at least one name column | the food's name in each language |
| `name` | — | a single name, used when the current language's column is empty |
| `category` | no | `protein`, `dairy_eggs`, `grains`, `legumes`, `vegetables`, `fruit`, `nuts_seeds`, `fats_oils`, `snacks_sweets`, `drinks`; anything else is rejected, and no column means `other` |
| `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` | yes | grams per 100 g, `0`–`100` |

Columns may be in any order. Rows that fail are listed one by one in the upload
dialog, and the valid rows are still imported.

The 100 foods the database loads on its own live in `../seed/foods.json`.
