UPDATE question_options
SET option_text = 'Грешно',
    is_correct  = 1
WHERE question_id  = 60
  AND label = 'A';



