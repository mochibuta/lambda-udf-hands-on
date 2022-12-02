redshift-serverlessを立ち上げ、lambdaUDFを試すことができます

作成するAWSリソース

- RedshiftStack
  - S3 Bucket (データ投入用) 
  - Redshift Serverless一式
    - Role
    - Secret(adminユーザの認証情報)
    - Security Group
    - Namespace
    - Workgroup
- LambdaUdfStack
  - lambda function (node 18)



# 準備
1. cdkスタックをデプロイする `make up`
2. [The Complete Pokemon Dataset](https://www.kaggle.com/datasets/rounakbanik/pokemon)から`pokemon.csv`をダウンロードして
`./dataset`に保存する
3. s3にcsvをアップロードしておく `make upload-dataset`
4. adminユーザの接続情報を取得する`make describe-secret`

# お試し用SQL
```sql
-- 1. データコピー用テーブル作成
drop table if exists dev.public.pokemon;
create temp table if not exists dev.public.pokemon(
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
copy dev.public.pokemon from 's3://redshiftstack-databucketxxxxxxxxxxxxxxxxxxxxxx/pokemon.csv'
    iam_role 'arn:aws:iam::xxxxxxxxxx:role/RedshiftServerlessRole'
    format as csv IGNOREHEADER 1;

-- 3. lambdaUDF作成
create or replace external function dev.public.f_pokemon_name_translate (pokedex_number int) returns varchar stable lambda 'udf-pokemon-name-translate' iam_role 'arn:aws:iam::xxxxxxxxxx:role/RedshiftServerlessRole';

-- 4. lambdaUDFテスト
select dev.public.f_pokemon_name_translate(123);

-- 5. 利用例
with translated as (
    select name as en, japanese_name as ja, json_parse(dev.public.f_pokemon_name_translate(pokedex_number)) as t, * from dev.public.pokemon
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
drop table if exists dev.public.pokemon;
drop function dev.public.f_pokemon_name_translate (pokedex_number int);
drop function dev.public.f_parse_abilities (abilities text);
```

# 参考
* [UDF のための Python 言語のサポート](https://docs.aws.amazon.com/ja_jp/redshift/latest/dg/udf-python-language-support.html)
* [スカラー Lambda UDF の作成](https://docs.aws.amazon.com/ja_jp/redshift/latest/dg/udf-creating-a-lambda-sql-udf.html)
