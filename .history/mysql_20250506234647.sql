BEGIN;
  UPDATE question_options
  SET 
    option_text = 'Автор на първия български роман',
    is_correct  = 0
  WHERE question_id = 54
    AND label = 'C';

  UPDATE question_options
  SET is_correct = CASE WHEN label = 'A' THEN 1 ELSE 0 END
  WHERE question_id = 54;
COMMIT;




