redshiftでlambdaUDFのお試し用  
cdkでudf用lambda(node)とredshiftからのinvoke用Roleが作成されます

# 参考
* [UDF のための Python 言語のサポート](https://docs.aws.amazon.com/ja_jp/redshift/latest/dg/udf-python-language-support.html)
* [スカラー Lambda UDF の作成](https://docs.aws.amazon.com/ja_jp/redshift/latest/dg/udf-creating-a-lambda-sql-udf.html)

# 準備
1. cdkスタックをデプロイする `make up`  
   以下のCfnOutputを控えておく  
   - `LambdaUdfHandsOnStack.OutputDataBucketName`  
   - `LambdaUdfHandsOnStack.OutputInvokeRoleArn`
2. [The Complete Pokemon Dataset](https://www.kaggle.com/datasets/rounakbanik/pokemon)から`pokemon.csv`をダウンロードして
`./dataset`に保存する
3. s3にcsvをアップロードしておく `make upload-dataset`
4. redshiftにlambdaUDFを呼び出すためのRoleをアタッチする
   - `REDSHIFT_CLUSTER=xxxx-xxxx make attach-role`


# お試し用SQL
```sql
-- parameter example
-- :orig_table_name = pokemon
-- :bucket = s3://lambdaudfhandsonstack-databucketxxxxxxxxxxxxxxxxx
-- :invoke_role = arn:aws:iam::${AWSAccountId}:role/RedshiftUdfInvokeRole
-- :role = arn:aws:iam::${AWSAccountId}:role/RedshiftS3Role


-- 1. データコピー用テーブル作成
drop table if exists :orig_table_name;
create temp table if not exists :orig_table_name(
    abilities         text,
    against_bug       float4,
    against_dark      float4,
    against_dragon    float4,
    against_electric  float4,
    against_fairy     float4,
    against_fight     float4,
    against_fire      float4,
    against_flying    float4,
    against_ghost     float4,
    against_grass     float4,
    against_ground    float4,
    against_ice       float4,
    against_normal    float4,
    against_poison    float4,
    against_psychic   float4,
    against_rock      float4,
    against_steel     float4,
    against_water     float4,
    attack            int,
    base_egg_steps    int,
    base_happiness    int,
    base_total        int,
    capture_rate      text,
    classfication     text,
    defense           int,
    experience_growth int,
    height_m          float4,
    hp                int,
    japanese_name     text,
    name              text,
    percentage_male   float4,
    pokedex_number    int,
    sp_attack         int,
    sp_defense        int,
    speed             int,
    type1             text,
    type2             text,
    weight_kg         float4,
    generation        int,
    is_legendary      bool
);

-- 2. s3からデータをコピー
copy :orig_table_name from :bucket iam_role :role format as csv IGNOREHEADER 1;

-- 3. lambdaUDF作成
create or replace external function f_pokemon_name_translate (pokedex_number int) returns varchar stable lambda 'udf-pokemon-name-translate' iam_role :invoke_role;

-- 4. lambdaUDFテスト
select f_pokemon_name_translate(123);

-- 5. 利用例
with translated as (
    select name as en, japanese_name as ja, json_parse(f_pokemon_name_translate(pokedex_number)) as t, * from :orig_table_name
)
select
    en,
    ja,
    t.de::text,
        t.fr::text,
        t.zhs::text
from
    translated
;

-- ex. python udfのサンプル
create or replace function f_parse_abilities(
    abilities text
) RETURNS text
    IMMUTABLE as
$$
   import json

   a=eval(abilities)
   d={}

   for i,item in enumerate(a):
       k="ability_{}".format(i)
       d.update({k:item})

   return json.dumps(d)
$$ language plpythonu;

with parsed as (
    select *, json_parse(f_parse_abilities(abilities)) as json
    from :orig_table_name
)
select
    value::text as v,
        count(*)    as cnt
from
    parsed as pd,
    unpivot pd.json as value at key
group by v
order by cnt desc;


-- お掃除
drop table if exists :orig_table_name;
drop function f_pokemon_name_translate (pokedex_number int);
drop function f_parse_abilities (abilities text);
```