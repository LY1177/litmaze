BEGIN;

  -- 1. Изтриваме старите опции за question_id = 57
  DELETE FROM question_options
  WHERE question_id = 57;

  -- 2. Изтриваме самия въпрос
  DELETE FROM questions
  WHERE id = 57;

  -- 3. Вмъкваме новия въпрос за Пенчо Славейков с id = 57
  INSERT INTO questions (id, author_id, question, explanation, type) VALUES
    (57, 6,
     'Свържете биографични факти за Пенчо Славейков с кратко описание:',
     'a) Роден е през 1866 г. във Варна
b) Международна литературна и академична дейност в чужбина
c) Основоположник на българския символизъм',
     'matching');

  -- 4. Вмъкваме новите опции със същите id-та 184–186
  INSERT INTO question_options (id, question_id, label, option_text, matching_key) VALUES
    (184, 57, 'I',   'Роден е през 1866 г. във Варна',                           'a'),
    (185, 57, 'II',  'Води литературна и академична дейност в чужбина',         'b'),
    (186, 57, 'III', 'Основоположник на българския символизъм',                'c');

COMMIT;



