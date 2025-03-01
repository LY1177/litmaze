
SELECT q.id AS question_id, q.question, q.explanation, q.type,
       q.text_id,  -- << тук
       COALESCE(qo.label, '') AS label,
       ...
