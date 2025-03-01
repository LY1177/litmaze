// script.js

// Глобални променливи
let currentUser = null;
let currentLevel = 1;
let score = 0;
let currentMaze = [];
let revealedMaze = [];
let playerPos = { row: 0, col: 0 };
let currentAuthor = null;
let gameQuestions = [];
const MAX_LEVEL = 5;

// Примерни лабиринти за 12 автора (2 нива – примерно)
const labyrinths = {
  vazov: {
    name: "Иван Вазов",
    levels: {
      1: [
        [
          [3, 0, 1, 4],
          [1, 0, 1, 0],
          [1, 0, 0, 0],
          [1, 1, 1, 1]
        ]
      ],
      2: [
        [
          [3, 0, 1, 0, 1],
          [1, 0, 0, 0, 1],
          [4, 1, 1, 0, 1],
          [0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1]
        ]
      ],
      3: [
        [
          [3, 0, 1, 0, 1, 0],
          [1, 0, 0, 0, 0, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 1, 0],
          [1, 1, 1, 1, 1, 0],
          [1, 1, 1, 1, 1, 4]
        ]
      ]
    }
  },
  aleko: {
    name: "Алеко Константинов",
    levels: {
      1: [
        [
          [3, 0, 1, 1],
          [1, 0, 1, 0],
          [1, 0, 0, 0],
          [4, 0, 1, 1]
        ]
      ],
      2: [
        [
          [3, 0, 1, 0, 1],
          [1, 0, 0, 0, 1],
          [0, 1, 1, 0, 1],
          [0, 0, 0, 0, 1],
          [1, 1, 1, 1, 4]
        ]
      ],
      3: [
        [
          [3, 0, 1, 0, 1, 0],
          [1, 0, 0, 0, 0, 0],
          [4, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 1, 0],
          [1, 1, 1, 1, 1, 0],
          [1, 1, 1, 1, 1, 0]
        ]
      ]
    }
  },
  pelin: {
    name: "Елин Пелин",
    levels: {
      1: [
        [
          [3, 0, 1, 4],
          [1, 0, 1, 0],
          [1, 0, 0, 0],
          [1, 1, 1, 1]
        ]
      ],
      2: [
        [
          [3, 0, 1, 0, 1],
          [1, 0, 0, 0, 1],
          [4, 1, 1, 0, 1],
          [0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1]
        ]
      ],
      3: [
        [
          [3, 0, 1, 0, 1, 0],
          [1, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 1, 0],
          [1, 1, 0, 1, 1, 0],
          [1, 1, 4, 1, 1, 0]
        ]
      ]
    }
  },
  yordan: {
    name: "Йордан Йовков",
    levels: {
      1: [
        [
          [3, 0, 1, 0],
          [1, 0, 0, 0],
          [1, 0, 1, 0],
          [1, 1, 1, 4]
        ]
      ],
      2: [
        [
          [3, 0, 1, 0, 1],
          [1, 0, 0, 0, 1],
          [0, 1, 1, 0, 1],
          [0, 0, 0, 0, 1],
          [1, 1, 4, 1, 1]
        ]
      ],
      3: [
        [
          [3, 0, 1, 0, 0, 0],
          [1, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 0, 4],
          [1, 1, 0, 1, 1, 0],
          [1, 1, 0, 1, 1, 0]
        ]
      ]
    }
  },
  peyo: {
    name: "Пейо Яворов",
    levels: {
      1: [
        [
          [3, 0, 1, 0],
          [1, 0, 1, 0],
          [1, 0, 0, 0],
          [4, 0, 1, 1]
        ]
      ],
      2: [
        [
          [3, 0, 1, 0, 1],
          [1, 0, 0, 0, 1],
          [0, 1, 1, 0, 1],
          [0, 0, 0, 0, 0],
          [1, 1, 1, 1, 4]
        ]
      ],
      3: [
        [
          [3, 0, 1, 0, 1, 0],
          [1, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 0, 0],
          [1, 1, 0, 1, 1, 0],
          [1, 1, 0, 1, 1, 4]
        ]
      ]
    }
  },
  petko: {
    name: "Петко Славейков",
    levels: {
      1: [
        [
          [3, 0, 1, 0],
          [1, 0, 1, 0],
          [1, 0, 0, 0],
          [1, 1, 4, 0]
        ]
      ],
      2: [
        [
          [0, 0, 3, 0, 1],
          [1, 0, 0, 0, 1],
          [4, 1, 1, 0, 4],
          [0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1]
        ]
      ],
      3: [
        [
          [0, 0, 1, 0, 1, 0],
          [1, 0, 0, 0, 1, 0],
          [3, 1, 0, 1, 1, 0],
          [0, 0, 0, 0, 0, 0],
          [1, 1, 0, 1, 0, 0],
          [1, 1, 0, 1, 4, 0]
        ]
      ]
    }
  },
  hristo: {
    name: "Христо Ботев",
    levels: {
      1: [
        [
          [4, 0, 1, 0],
          [1, 0, 1, 0],
          [1, 0, 0, 0],
          [1, 1, 1, 3]
        ]
      ],
      2: [
        [
          [0, 0, 4, 0, 1],
          [1, 0, 0, 0, 1],
          [0, 1, 1, 0, 1],
          [0, 0, 0, 0, 0],
          [1, 1, 1, 1, 3]
        ]
      ],
      3: [
        [
          [3, 0, 1, 0, 1, 0],
          [1, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 1, 0],
          [1, 1, 0, 1, 1, 0],
          [1, 1, 4, 1, 1, 0]
        ]
      ]
    }
  },
  dobri: {
    name: "Добри Чинтулов",
    levels: {
      1: [
        [
          [3, 0, 1, 0],
          [1, 0, 1, 0],
          [1, 0, 0, 4],
          [1, 1, 1, 1]
        ]
      ],
      2: [
        [
          [0, 0, 1, 0, 1],
          [0, 0, 0, 0, 1],
          [3, 1, 1, 0, 1],
          [0, 0, 0, 0, 4],
          [1, 1, 1, 1, 1]
        ]
      ],
      3: [
        [
          [0, 0, 1, 0, 0, 4],
          [1, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 1, 0],
          [1, 0, 0, 1, 1, 0],
          [3, 0, 0, 1, 1, 0]
        ]
      ]
    }
  },
  
  veselin: {
    name: "Веселин Ханчев",
    levels: {
      1: [
        [
          [0, 0, 3, 0],
          [1, 0, 1, 0],
          [4, 1, 0, 0],
          [0, 0, 0, 1]
        ]
      ],
      2: [
        [
          [0, 0, 1, 0, 1],
          [0, 0, 0, 0, 1],
          [0, 1, 1, 0, 3],
          [0, 1, 0, 0, 0],
          [4, 1, 1, 1, 1]
        ]
      ],
      3: [
        [
          [3, 0, 1, 0, 0, 4],
          [1, 0, 0, 0, 1, 0],
          [1, 0, 1, 0, 1, 0],
          [1, 0, 0, 0, 1, 0],
          [1, 1, 1, 1, 1, 0],
          [3, 1, 1, 1, 1, 0]
        ]
      ]
    }
  },
  lyuben: {
    name: "Любен Каравелов",
    levels: {
      1: [
        [
          [3, 1, 1, 4],
          [0, 1, 0, 0],
          [0, 1, 0, 1],
          [0, 0, 0, 1]
        ]
      ],
      2: [
        [
          [4, 1, 3, 0, 1],
          [0, 1, 0, 0, 1],
          [0, 1, 1, 0, 1],
          [0, 0, 0, 0, 0],
          [1, 1, 1, 1, 1]
        ]
      ],
      3: [
        [
          [0, 0, 1, 0, 0, 0],
          [1, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 1, 4],
          [0, 0, 0, 1, 1, 0],
          [3, 1, 0, 0, 0, 0]
        ]
      ]
    }
  },
  smirnenski: {
    name: "Христо Смирненски",
    levels: {
      1: [
        [
          [0, 0, 1, 3],
          [1, 0, 1, 0],
          [4, 0, 0, 0],
          [1, 1, 1, 1]
        ]
      ],
      2: [
        [
          [0, 0, 1, 0, 1],
          [0, 0, 0, 0, 1],
          [0, 0, 1, 0, 3],
          [0, 0, 1, 1, 1],
          [0, 0, 0, 0, 4]
        ]
      ],
      3: [
        [
          [0, 0, 1, 0, 0, 4],
          [1, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 1],
          [0, 0, 1, 0, 1, 0],
          [1, 0, 1, 0, 1, 0],
          [3, 0, 1, 0, 0, 3]
        ]
      ]
    }
  },
  obobshtenie: {
    name: "Обобщение",
    levels: {
      1: [
        [
          [3, 0, 1, 4],
          [0, 1, 0, 0],
          [0, 0, 0, 1],
          [1, 1, 1, 1]
        ]
      ],
      2: [
        [
          [0, 3, 1, 0, 1],
          [0, 0, 0, 0, 1],
          [1, 1, 0, 0, 1],
          [1, 1, 0, 0, 0],
          [4, 0, 0, 1, 1]
        ]
      ],
      3: [
        [
          [0, 0, 1, 0, 0, 3],
          [1, 0, 0, 0, 1, 0],
          [0, 1, 1, 0, 1, 0],
          [0, 0, 0, 0, 1, 0],
          [1, 0, 0, 0, 0, 0],
          [4, 0, 1, 1, 1, 0]
        ]
      ]
    }
  },
  nvo2022: {
    name: "НВО 2022",
    levels: {
      1: [
        [
          [1, 1, 1],
          [0, 0, 0],
          [3, 1, 4]
        ]
      ],
      2: [
        [
          [3, 0, 1],
          [1, 0, 1],
          [1, 0, 4]
        ]
      ]
    }
  },
  nvo2023: {
    name: "НВО 2023",
    levels: {
      1: [
        [
          [0, 0, 0],
          [3, 1, 4]
        ]
      ],
      2: [
        [
          [3, 0, 1],
          [1, 0, 4]
        ]
      ]
    }
  },
  nvo2024: {
    name: "НВО 2024",
    levels: {
      1: [
        [
          [0, 0, 0],
          [3, 1, 4]
        ]
      ],
      2: [
        [
          [3, 0, 1],
          [1, 0, 4]
        ]
      ]
    }
  },
};

// Мапинг на кратки имена към пълно име
const authorDisplayName = {
  "vazov": "Иван Вазов",
  "aleko": "Алеко Константинов",
  "pelin": "Елин Пелин",
  "yordan": "Йордан Йовков",
  "peyo": "Пейо Яворов",
  "pencho": "Пенчо Славейков",
  "hristo": "Христо Ботев",
  "dobri": "Добри Чинтулов",
  "obobshtenie": "Обобщение",
  "petko": "Петко Славейков",
  "lyuben": "Любен Каравелов",
  "smirnenski": "Христо Смирненски",
  "nvo2022": "НВО 2022",
  "nvo2023": "НВО 2023",
  "nvo2024": "НВО 2024"
};

// Функция за извличане на въпроси (примерен API)
function getQuestionsForAuthor(authorName, callback) {
  // fetch(`http://localhost:3000/api/questions?author=${encodeURIComponent(authorName)}`)
     
   fetch("https://litmaze.onrender.com/api/questions?author=" + encodeURIComponent(authorName))
    .then(r => r.json())
    .then(data => callback(data))
    .catch(err => console.error("Грешка при извличане на въпроси:", err));
}

// Инициализация на лабиринта
function initMazeFromAuthor() {
  if (!currentAuthor) return;
  const labyrinthData = labyrinths[currentAuthor];
  if (!labyrinthData) {
    console.error("Няма лабиринт за този автор:", currentAuthor);
    return;
  }
  currentLevel = 1;
  document.getElementById('current-level').textContent = currentLevel;
  loadMazeLevel(currentAuthor, currentLevel);
}

// Зареждане на ниво
function loadMazeLevel(authorKey, level) {
  const levelMazes = labyrinths[authorKey].levels[level];
  if (!levelMazes) {
    alert("Няма лабиринт за това ниво.");
    return;
  }
  currentMaze = JSON.parse(JSON.stringify(levelMazes[0]));
  initRevealedMaze();
  
  // Намираме вход (3)
  for (let r = 0; r < currentMaze.length; r++) {
    for (let c = 0; c < currentMaze[r].length; c++) {
      if (currentMaze[r][c] === 3) {
        playerPos = { row: r, col: c };
      }
    }
  }
  
  getQuestionsForAuthor(currentAuthor, (questions) => {
    gameQuestions = questions;
    renderMaze();
  });
}
// За дългия текст
function loadPassage(textId) {
  // Извикваме API endpoint-а /api/texts с параметър id, като стойността на textId се кодират за сигурност.
  fetch(`/api/texts?id=${encodeURIComponent(textId)}`)
    // Преобразуваме отговора в JSON формат.
    .then(response => response.json())
    // След успешното преобразуване, data се очаква да съдържа поле content.
    .then(data => {
      // Намираме HTML елемента с id "passage-container"
      const passageContainer = document.getElementById('passage-container');
      if (passageContainer) {
        // Задаваме неговия текстов контент със съдържанието от data.content
        passageContainer.textContent = data.content;
      }
    })
    // Ако възникне грешка по време на заявката или преобразуването, тя се отпечатва в конзолата.
    .catch(err => console.error("Грешка при зареждането на текста:", err)); 
    document.getElementById('close-passage-btn').addEventListener('click', () => {
      const passageModal = document.getElementById('passage-modal');
      if (passageModal) {
        passageModal.classList.remove('visible');
        passageModal.classList.add('hidden');
      }
    });
}
// Инициализация на revealedMaze
function initRevealedMaze() {
  revealedMaze = [];
  const rows = currentMaze.length;
  const cols = currentMaze[0].length;
  for (let i = 0; i < rows; i++) {
    revealedMaze[i] = [];
    for (let j = 0; j < cols; j++) {
      revealedMaze[i][j] = (currentMaze[i][j] === 3 || currentMaze[i][j] === 4) ? 0 : 1;
    }
  }
}

// Рендиране на лабиринта
function renderMaze() {
  const mazeDiv = document.getElementById('maze-active');
  mazeDiv.innerHTML = "";
  const rows = currentMaze.length;
  const cols = currentMaze[0].length;
  
  mazeDiv.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  mazeDiv.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      
      if (revealedMaze[r][c] === 0) {
        cell.classList.add('path');
      }
      if (currentMaze[r][c] === 3) {
        cell.classList.add('entrance');
        const hint = getNextStepDirection(currentMaze, playerPos);
        if (hint) {
          cell.dataset.hint = hint.name;
          cell.classList.add('hint');
        }
      }
      if (currentMaze[r][c] === 4) {
        cell.classList.add('exit');
      }
      if (r === playerPos.row && c === playerPos.col) {
        cell.classList.add('player');
      }
      
      cell.addEventListener('click', () => handleCellClick(r, c));
      mazeDiv.appendChild(cell);
    }
  }
  updateHeroPosition();
}

// Позициониране на героя – центриран (без offset)
function updateHeroPosition() {
  const mazeActive = document.getElementById('maze-active');
  const hero = document.getElementById('hero');
  if (!mazeActive || !hero) return;
  
  const rows = currentMaze.length;
  const cols = currentMaze[0].length;
  const cellWidth = mazeActive.clientWidth / cols;
  const cellHeight = mazeActive.clientHeight / rows;
  const cellX = playerPos.col * cellWidth;
  const cellY = playerPos.row * cellHeight;
  
  // Без изместване, за да е центриран
  hero.style.left = cellX + "px";
  hero.style.top = cellY + "px";
  hero.style.width = cellWidth + "px";
  hero.style.height = cellHeight + "px";
  hero.style.lineHeight = cellHeight + "px";
  hero.textContent = "🕵";
  // hero.textContent = "🙂";
}

// Клик върху клетка
function handleCellClick(row, col) {
  if (!isAdjacent(playerPos.row, playerPos.col, row, col)) {
    alert("Можете да се движите само към съседни клетки!");
    return;
  }
  if (currentMaze[row][col] === 1) {
    alert("Това е стена!");
    return;
  }
  showQuestion(() => {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
      cell.classList.add('open-door');
      doorSound.play();
      setTimeout(() => {
        revealedMaze[row][col] = 0;
        updateScore(10);
        const oldDist = getShortestPathDistance(currentMaze, playerPos);
        movePlayer(row, col);
        const newDist = getShortestPathDistance(currentMaze, playerPos);
        if (newDist > oldDist) {
          alert("Връщаш се назад, следвай посоката и отговаряй на въпросите, за да излезеш от лабиринта.");
        }
      }, 1500);
    } else {
      revealedMaze[row][col] = 0;
      updateScore(10);
      movePlayer(row, col);
    }
  });
}

function movePlayer(newRow, newCol) {
  playerPos = { row: newRow, col: newCol };
  renderMaze();
  if (currentMaze[newRow][newCol] === 4) {
    alert("Поздравления! Излязохте от лабиринта!");
    updateScore(100);
    document.getElementById('next-level').classList.remove('hidden');
  }
}

function isAdjacent(r1, c1, r2, c2) {
  return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
}

function updateScore(points) {
  score += points;
  document.getElementById('score').textContent = score;
}

// Показване на въпрос

function showQuestion(onCorrect) {
  // Ако няма повече въпроси, извикваме callback-а
  if (gameQuestions.length === 0) {
    onCorrect();
    return;
  }
  
  // Избираме случайно въпрос
  const randomIndex = Math.floor(Math.random() * gameQuestions.length);
  const q = gameQuestions[randomIndex];
  console.log("Текущ въпрос:", q);
  // Показваме модал прозореца за въпрос
  const modal = document.getElementById('question-modal');
  modal.classList.remove('hidden');
  
  // Задаваме заглавието и текста на въпроса
  document.getElementById('question-title').textContent = "Въпрос";
  document.getElementById('question-text').textContent = q.question;
  
  const answersDiv = document.getElementById('question-answers');
  answersDiv.innerHTML = "";
  
  // Ако въпросът има свързан текст (и е за НВО)
  
  if (currentAuthor && currentAuthor.startsWith("nvo") && q.textId) {
    console.log("currentAuthor:", currentAuthor);
    const textBtn = document.createElement('button');
    textBtn.textContent = "Покажи текст";
    textBtn.classList.add('btn');
    textBtn.addEventListener('click', () => {
      loadPassage(q.textId);
      // Ако контейнерът за текста е скрит, го правим видим
      const passageContainer = document.getElementById('passage-container');
      if (passageContainer) {
        passageContainer.style.display = 'block';
      }
    });
    answersDiv.appendChild(textBtn);
    answersDiv.appendChild(document.createElement('br'));
  }
  
  // За въпроси от тип multiple_choice – използваме <span> за опции
  if (q.type === 'multiple_choice') {
    (q.options || []).forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = `${opt.label}) ${opt.option_text}`;
      btn.addEventListener('click', () => {
        if (opt.is_correct) {
          correctSound.play().catch(err => console.error("Error playing correct sound:", err));
          alert("Правилен отговор!");
          gameQuestions.splice(randomIndex, 1);
          closeQuestionModal();
          onCorrect();
        } else {
          wrongSound.play().catch(err => console.error("Error playing wrong sound:", err));
          alert("Грешен отговор! Опитайте отново.");
        }
      });
      answersDiv.appendChild(btn);
      answersDiv.appendChild(document.createElement('br'));
    });
  }
  // За въпроси от тип true_false – използваме <span> и добавяме префикс, ако има
  else if (q.type === 'true_false') {
    (q.options || []).forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt.option_text;
      btn.addEventListener('click', () => {
        if (opt.is_correct) {
          correctSound.play().catch(err => console.error("Error playing correct sound:", err));
          alert("Правилен отговор!");
          gameQuestions.splice(randomIndex, 1);
          closeQuestionModal();
          onCorrect();
        } else {
          wrongSound.play().catch(err => console.error("Error playing wrong sound:", err));
          alert("Грешен отговор! Опитайте отново.");
        }
      });
      answersDiv.appendChild(btn);
      answersDiv.appendChild(document.createElement('br'));
    });
  }
  // За въпроси от тип matching – извикваме съответната функция
  else if (q.type === 'matching') {
    renderMatchingDragDrop(q, answersDiv, () => {
      gameQuestions.splice(randomIndex, 1);
      closeQuestionModal();
      onCorrect();
    });
  }
}

function closeQuestionModal() {
  document.getElementById('question-modal').classList.add('hidden');
}


// Drag & drop (matching)
function renderMatchingDragDrop(q, container, onCorrect) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('matching-wrapper');
  
  const leftCol = document.createElement('div');
  leftCol.classList.add('left-col');
  
  (q.options || []).forEach(opt => {
    const item = document.createElement('div');
    item.classList.add('draggable-item');
    item.setAttribute('draggable', 'true');
    item.dataset.matchKey = opt.matching_key;
    item.textContent = `${opt.label}) ${opt.option_text}`;
    
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    leftCol.appendChild(item);
  });
  
  const rightCol = document.createElement('div');
  rightCol.classList.add('right-col');
  
  let explanationText = (q.explanation || "").replace(/\\n/g, '\n');
  const lines = explanationText.split('\n');
  
  lines.forEach(line => {
    const mk = line.trim().charAt(0);
    const row = document.createElement('div');
    row.classList.add('matching-right-item-row');
    
    const zoneLabel = document.createElement('div');
    zoneLabel.classList.add('zone-label');
    zoneLabel.textContent = line;
    
    const zoneDrop = document.createElement('div');
    zoneDrop.classList.add('droppable-zone');
    zoneDrop.dataset.matchKey = mk;
    
    zoneDrop.addEventListener('dragover', handleDragOver);
    zoneDrop.addEventListener('drop', handleDrop);
    zoneDrop.addEventListener('dragenter', () => zoneDrop.classList.add('drag-over'));
    zoneDrop.addEventListener('dragleave', () => zoneDrop.classList.remove('drag-over'));
    
    row.appendChild(zoneLabel);
    row.appendChild(zoneDrop);
    rightCol.appendChild(row);
  });
  
  wrapper.appendChild(leftCol);
  wrapper.appendChild(rightCol);
  container.appendChild(wrapper);
  
  const checkBtn = document.createElement('button');
  checkBtn.textContent = "Провери свързването";
  checkBtn.addEventListener('click', () => {
    const zones = wrapper.querySelectorAll('.droppable-zone');
    let allCorrect = true;
    zones.forEach(zone => {
      const draggedItem = zone.querySelector('.draggable-item');
      if (!draggedItem || zone.dataset.matchKey !== draggedItem.dataset.matchKey) {
        allCorrect = false;
      }
    });
   
    if (allCorrect) {
      correctSound.play().catch(err => console.error("Error playing correct sound:", err));
      alert("Всичко е свързано правилно!");
      closeQuestionModal();
      onCorrect();
    } else {
      wrongSound.play().catch(err => console.error("Error playing wrong sound:", err));
      alert("Има грешки. Опитайте пак!");
      zones.forEach(zone => {
        const item = zone.querySelector('.draggable-item');
        if (item) {
          leftCol.appendChild(item);
        }
      });
    }
  });
  //  wrapper.appendChild(checkBtn);
  container.appendChild(checkBtn); 
}


// Drag & drop
function handleDragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.dataset.matchKey);
  e.target.classList.add('dragging');
}
function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}
function handleDragOver(e) {
  e.preventDefault();
}
function handleDrop(e) {
  e.preventDefault();
  const zone = e.target;
  zone.classList.remove('drag-over');
 // const zoneText = zone.textContent;
 // zone.innerHTML = zoneText;
  const draggingItem = document.querySelector('.dragging');
  if (draggingItem) {
    zone.appendChild(draggingItem);
  }
}

// BFS – подсказка
function getNextStepDirection(maze, startPos) {
  const rows = maze.length;
  const cols = maze[0].length;
  function isValid(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols && maze[r][c] !== 1;
  }
  const queue = [];
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  queue.push({ row: startPos.row, col: startPos.col, path: [] });
  visited[startPos.row][startPos.col] = true;
  
  const directions = [
    { dr: -1, dc: 0, name: "нагоре" },
    { dr: 1, dc: 0, name: "надолу" },
    { dr: 0, dc: -1, name: "наляво" },
    { dr: 0, dc: 1, name: "надясно" }
  ];
  
  while (queue.length > 0) {
    const curr = queue.shift();
    if (maze[curr.row][curr.col] === 4) {
      return curr.path.length > 0 ? curr.path[0] : null;
    }
    for (const dir of directions) {
      const nr = curr.row + dir.dr;
      const nc = curr.col + dir.dc;
      if (isValid(nr, nc) && !visited[nr][nc]) {
        visited[nr][nc] = true;
        const newPath = [...curr.path, dir];
        queue.push({ row: nr, col: nc, path: newPath });
      }
    }
  }
  return null;
}

// BFS – кратък път
function getShortestPathDistance(maze, startPos) {
  const rows = maze.length;
  const cols = maze[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [];
  queue.push({ row: startPos.row, col: startPos.col, dist: 0 });
  visited[startPos.row][startPos.col] = true;
  
  while (queue.length > 0) {
    const curr = queue.shift();
    if (maze[curr.row][curr.col] === 4) {
      return curr.dist;
    }
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];
    for (let d of directions) {
      const nr = curr.row + d.dr;
      const nc = curr.col + d.dc;
      if (
        nr >= 0 && nr < rows &&
        nc >= 0 && nc < cols &&
        maze[nr][nc] !== 1 &&
        !visited[nr][nc]
      ) {
        visited[nr][nc] = true;
        queue.push({ row: nr, col: nc, dist: curr.dist + 1 });
      }
    }
  }
  return Infinity;
}

// Аудио
let backgroundMusic, doorSound, correctSound, wrongSound;

document.addEventListener('DOMContentLoaded', () => {
  // Аудио инициализация
  backgroundMusic = new Audio('audio/epic-adventure.mp3');
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.5;
  
  doorSound = new Audio('audio/door-creak.mp3');
  doorSound.volume = 0.2;
  
  correctSound = new Audio('audio/correct.mp3');
  correctSound.volume = 0.5;
  
  wrongSound = new Audio('audio/wrong.mp3');
  wrongSound.volume = 0.5;
  
  // Слайдер за регулиране на звука
  const volumeControl = document.getElementById('volume-control');
  volumeControl.addEventListener('input', function() {
    const vol = parseFloat(this.value);
    backgroundMusic.volume = vol;
    doorSound.volume = vol;
    correctSound.volume = vol;
    wrongSound.volume = vol;
  });
  
  // Отваряне на НВО модала
  document.getElementById('nvo-btn').addEventListener('click', () => {
    const nvoModal = document.getElementById('nvo-modal');
    nvoModal.classList.remove('hidden');
    nvoModal.classList.add('visible');
  });
  
  // Затваряне на НВО модала
  document.getElementById('nvo-close-btn').addEventListener('click', () => {
    const nvoModal = document.getElementById('nvo-modal');
    nvoModal.classList.remove('visible');
    nvoModal.classList.add('hidden');
  });
  
  // Обработка за бутона "Вход" в НВО модала
  document.getElementById('nvo-select-btn').addEventListener('click', () => {
    const select = document.getElementById('nvo-year-select');
    const selectedKey = select.value; // напр. "nvo2022"
    console.log("Избраният ключ е:", selectedKey);
    if (!selectedKey) {
      alert("Моля, изберете година!");
      return;
    }
    const nvoModal = document.getElementById('nvo-modal');
    nvoModal.classList.remove('visible');
    nvoModal.classList.add('hidden');
    selectAuthor(selectedKey);
  });
  
  // Обработка за бутона за музика (пауза/възпроизвеждане)
  const musicToggleBtn = document.getElementById('music-toggle-btn');
  if(musicToggleBtn){
    musicToggleBtn.addEventListener('click', () => {
      if (backgroundMusic.paused) {
        backgroundMusic.play();
        musicToggleBtn.textContent = "Пауза музика";
      } else {
        backgroundMusic.pause();
        musicToggleBtn.textContent = "Възпроизведи музика";
      }
    });
  }

  // Логин
  const loginModal = document.getElementById('login-modal');
  document.getElementById('login-btn').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    if (!username) {
      alert("Моля, въведете потребителско име.");
      return;
    }
    currentUser = username;
    document.getElementById('display-username').textContent = currentUser;
    loginModal.classList.remove('visible');
    loginModal.classList.add('hidden');
  });
  
  // Бутони "Вход" на картите
  document.querySelectorAll('.enter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = e.target.closest('.card');
      const author = card.dataset.author;
      selectAuthor(author);
    });
  });
  
  // Флипване на картите при клик
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      card.querySelector('.card-inner').classList.toggle('flipped');
    });
  });
  
  // Бутон "Назад към авторите"
  document.getElementById('back-to-authors').addEventListener('click', () => {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    currentAuthor = null;
    currentLevel = 1;
    score = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('current-level').textContent = currentLevel;
    document.getElementById('labyrinth-title').textContent = "Лабиринт";
    document.getElementById('author-selection').classList.remove('hidden');
    document.getElementById('game-container').classList.add('hidden');
  });
  
  // Движение с клавиатурата
  document.addEventListener('keydown', (e) => {
    const moves = {
      ArrowUp: { dr: -1, dc: 0 },
      ArrowDown: { dr: 1, dc: 0 },
      ArrowLeft: { dr: 0, dc: -1 },
      ArrowRight: { dr: 0, dc: 1 }
    };
    if (moves[e.key]) {
      const { dr, dc } = moves[e.key];
      const newRow = playerPos.row + dr;
      const newCol = playerPos.col + dc;
      if (
        newRow >= 0 && newRow < currentMaze.length &&
        newCol >= 0 && newCol < currentMaze[0].length &&
        revealedMaze[newRow][newCol] === 0
      ) {
        movePlayer(newRow, newCol);
      }
    }
  });
  
  // Бутон "Следващо ниво"
  document.getElementById('next-level').addEventListener('click', () => {
    if (currentLevel < MAX_LEVEL) {
      currentLevel++;
      document.getElementById('current-level').textContent = currentLevel;
      loadMazeLevel(currentAuthor, currentLevel);
      document.getElementById('next-level').classList.add('hidden');
    } else {
      alert("Поздравления! Приключихте всички нива.");
    }
  });
  
  // Бутон "Правила на играта"
  const rulesModal = document.getElementById('rules-modal');
  document.getElementById('rules-btn').addEventListener('click', () => {
    rulesModal.classList.remove('hidden');
  });
  document.getElementById('close-rules').addEventListener('click', () => {
    rulesModal.classList.add('hidden');
  });
  
  // Бутон "Затвори" за въпросния модал
  document.getElementById('close-question-btn').addEventListener('click', closeQuestionModal);
  
  // Функция за избор на автор
  function selectAuthor(author) {
    currentAuthor = author;
    backgroundMusic.play();
    
    // Скриваме екран с картите, показваме лабиринта
    document.getElementById('author-selection').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    
    // Сменяме заглавието
    document.getElementById('labyrinth-title').textContent =
      "Лабиринт: " + (authorDisplayName[currentAuthor] || currentAuthor);
    
    initMazeFromAuthor();
  }
});