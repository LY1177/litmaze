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
let musicPaused = false;
const mazeBackgrounds = {
  vazov:    'images/mazes/vazov.png',
  aleko:    'images/mazes/aleko.png',
  pelin:    'images/mazes/pelin.png',
  yordan:   'images/mazes/yordan.png',
  peyo:     'images/mazes/peyo.png',
  petko:    'images/mazes/petko.png',
  hristo:   'images/mazes/hristo.png',
  dobri:    'images/mazes/dobri.png',
  veselin:  'images/mazes/veselin.png',
  lyuben:   'images/mazes/lyuben.png',
  smirnenski:'images/mazes/smirnenski.png',
  obobshtenie:'images/mazes/obobshtenie.png',
  nvo2022: 'images/mazes/nvo2022.png',
  nvo2023: 'images/mazes/nvo2023.png',
  nvo2024: 'images/mazes/nvo2024.png'


  // … и за NVO ако може би
};

const MAX_LEVEL = 5;
const funFacts = {
  vazov: [
    "Иван Вазов е наричан 'патриарх на българската литература'.",
    "Романът 'Под игото' първоначално е публикуван в списание, преди да стане книга.",
    "Вазов е автор на първото българско стихотворение в следосвобожденска България."
  ],
  aleko: [
    "Алеко Константинов е известен като пътешественик и е бил запален турист.",
    "Псевдонимът на Алеко е 'Щастливеца', иронично избран заради многото му лични несполуки.",
    "Алеко Константинов загива трагично при покушение, насочено не към него, а към негов спътник."
  ],
  nvo2022: [
    "Кольо Фичето строи Беленския мост над Янтра, който съществува и до днес.",
    "Според легендата, Кольо Фичето е спасил катедралата 'Света Богородица' в Париж.",
    "Кольо Фичето бил самоук строител, но признат за един от най-добрите архитекти на своето време."
  ],
  
};

// Лабиринти за 12 автора (3 нива)
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
          [1, 1, 1, 0, 4]
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
          [1, 1, 1, 1, 1, 0]
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
          [1, 1, 1, 1],
          [1, 0, 0, 1],
          [0, 0, 0, 1],
          [3, 1, 0, 4]
        ]
      ],
      2: [
        [
          [3, 0, 1, 1, 4],
          [1, 0, 1, 0, 0],
          [1, 0, 1, 0, 1],
          [1, 0, 0, 0 ,1],
          [1, 1, 1, 1, 1]
        ]
      ]
    }
  },
  nvo2023: {
    name: "НВО 2023",
    levels: {
      1: [
        [
          [1, 1, 1, 1],
          [1, 0, 0, 1],
          [0, 0, 0, 1],
          [3, 1, 0, 4]
        ]
      ],
      2: [
        [
          [3, 0, 1, 1, 4],
          [1, 0, 1, 0, 0],
          [1, 0, 1, 0, 1],
          [1, 0, 0, 0 ,1],
          [1, 1, 1, 1, 1]
        ]
      ]
    }
  },
  nvo2024: {
    name: "НВО 2024",
    levels: {
      1: [
        [
          [1, 1, 1, 1],
          [1, 0, 0, 1],
          [0, 0, 0, 1],
          [3, 1, 0, 4]
        ]
      ],
      2: [
        [
          [3, 0, 1, 1, 4],
          [1, 0, 1, 0, 0],
          [1, 0, 1, 0, 1],
          [1, 0, 0, 0 ,1],
          [1, 1, 1, 1, 1]
        ]
      ]
    }
  },
};

// Кратки имена към пълно име
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


function setMazeBackground(authorKey) {
  const container = document.getElementById('maze-container-active');
  const img = mazeBackgrounds[authorKey] || 'images/mazes/default.png';
  container.style.backgroundImage = `url('${img}')`;
  container.style.backgroundSize = 'cover';
  container.style.backgroundPosition = 'center';
  container.style.setProperty('--wall-image', `url('${img}')`);
}
function loadPassage(textId) {
  console.log("Зареждам текст с id:", textId);
  fetch(`/api/texts?id=${encodeURIComponent(textId)}`, {
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) throw new Error(`Грешка при зареждане: ${res.status}`);
      return res.json();
    })
    .then(data => {
      const passageContainer = document.getElementById('passage-container');
      passageContainer.textContent = data.content;
      const passageModal = document.getElementById('passage-modal');
      passageModal.classList.remove('hidden');
      passageModal.classList.add('visible');
    })
    .catch(err => {
      console.error(err);
      alert("Неуспешно зареждане на текста.");
    });
}


// Функция за извличане на въпроси (API)
function getQuestionsForAuthor(authorName, callback) {
  fetch(`http://localhost:3000/api/questions?author=${encodeURIComponent(authorName)}`)
     
  //  fetch("https://litmaze.onrender.com/api/questions?author=" + encodeURIComponent(authorName))
    .then(r => r.json())
    .then(data => callback(data))
    .catch(err => console.error("Грешка при извличане на въпроси:", err));
}
function getQuestionsForAuthor(authorName, callback) {
  // ако е обобщение (в HTML data-author="obobshtenie"), зареждаме без филтър
  const url = authorName === 'obobshtenie'
    ? '/api/questions'
    : `/api/questions?author=${encodeURIComponent(authorName)}`;

  fetch(url, { credentials: 'include' })
    .then(res => {
      if (!res.ok) throw new Error('Неуспешно зареждане на въпроси');
      return res.json();
    })
    .then(data => callback(data))
    .catch(err => console.error(err));
}

// function getQuestionsForAuthor(authorName, callback) {
//   fetch(`/api/questions?author=${encodeURIComponent(authorName)}`, {
//     credentials: 'include'
//   })
//     .then(res => {
//       if (!res.ok) throw new Error(`Неуспешно зареждане на въпроси: ${res.status}`);
//       return res.json();
//     })
//     .then(data => callback(data))
//     .catch(err => console.error("Грешка при извличане на въпроси:", err));
// }

// Инициализация на лабиринта
function initMazeFromAuthor() {
  if (!currentAuthor) return;
  setMazeBackground(currentAuthor);
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
  // задаваме фоновото изображение за този автор
   setMazeBackground(authorKey);
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
// --- Преминаване от избор на автор/НВО към играта ---
function selectAuthor(authorKey) {
  async function selectAuthor(authorKey) {
    // 1) скриваме/показваме нужните екрани…
    // 2) взимаме последните точки от бекенда
    const res = await fetch('/api/me', { credentials: 'include' });
    if (res.ok) {
      const me = await res.json();
      score = me.points;
      document.getElementById('score').textContent = score;
    }
    // 3) зареждаме лабиринта
    // …
  }
  
  currentAuthor = authorKey;
  // обновяваме заглавието на лабиринта
  document.getElementById('labyrinth-title').textContent = labyrinths[authorKey]?.name || '';
  // скриваме екрана с карти/НВО
  document.getElementById('author-selection').classList.add('hidden');
  // показваме екрана на играта
  document.getElementById('game-container').classList.remove('hidden');
  // зареждаме нивото и стартираме играта
  initMazeFromAuthor();
  // пускаме фоновата музика
  backgroundMusic.play();
}

// Бутона за затваряне
document.addEventListener('DOMContentLoaded', () => {
  console.log('register‑link =', document.getElementById('open-register-from-login'));

  // Отваряне/затваряне на регистрационния модал
document.getElementById('open-register-from-login').addEventListener('click', () => {
  document.getElementById('register-modal').classList.remove('hidden');
});
document.getElementById('close-register-btn').addEventListener('click', () => {
  document.getElementById('register-modal').classList.add('hidden');
});

// Изпращане на регистрация
document.getElementById('register-btn').addEventListener('click', () => {
  const username = document.getElementById('register-username').value.trim();
  const email    = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();

  if (!username || !email || !password) {
    alert("Моля, попълнете всички полета.");
    return;
  }

const openLoginBtn = document.getElementById('open-login');
if (openLoginBtn) {
openLoginBtn.addEventListener('click', () => {
document.getElementById('login-modal').classList.remove('hidden');
});
}
document.getElementById('open-register-from-login').addEventListener('click', () => {
  document.getElementById('register-modal').classList.remove('hidden');
});

// Затваряне на регистрационния модал
document.getElementById('close-register-btn').addEventListener('click', () => {
  document.getElementById('register-modal').classList.add('hidden');
});

//ТУКККК
  fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  })
    .then(res => {
      if (!res.ok) return res.text().then(txt => { throw new Error(txt) });
      return res.text();
    })
    .then(msg => {
      alert(msg);  // напр. "Регистрацията е успешна!"
      document.getElementById('register-modal').classList.add('hidden');
    })
    .catch(err => {
      alert(err.message);
    });
});
// });

  const closeBtn = document.getElementById('close-passage-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const passageModal = document.getElementById('passage-modal');
      if (passageModal) {
        passageModal.classList.remove('visible');
        passageModal.classList.add('hidden');
      }
    });
  }
  // Отваря регистрационния модал от логин-модала
document.getElementById('open-register-from-login')
.addEventListener('click', () => {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('register-modal').classList.remove('hidden');
});

// Затвори регистрационния модал (Отказ)
document.getElementById('close-register-btn')
  .addEventListener('click', () => {
    document.getElementById('register-modal').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
  });

// Клик върху Регистрация в самия модал
document.getElementById('register-btn')
  .addEventListener('click', () => {
    const username = document.getElementById('register-username').value.trim();
    const email    = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!username || !email || !password) {
      return alert("Попълнете всички полета.");
    }
  });

});


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
      if (currentMaze[r][c] === 1) {
        cell.classList.add('wall');
      }
      if (revealedMaze[r][c] === 0) {
        cell.classList.add('path');
      }
      if (currentMaze[r][c] === 3) {
        cell.classList.add('entrance');
        const enterLabel = document.createElement('div');
        enterLabel.classList.add('cell-label');
        enterLabel.textContent = 'Начало';
        cell.appendChild(enterLabel);
       
      }
      if (currentMaze[r][c] === 4) {
        cell.classList.add('exit');
        const exitLabel = document.createElement('div');
        exitLabel.classList.add('cell-label');
        exitLabel.textContent = 'Изход';
        cell.appendChild(exitLabel);
      }
      if (r === playerPos.row && c === playerPos.col) {
        cell.classList.add('player');
        const hint = getNextStepDirection(currentMaze, playerPos);
        if (hint) {
          cell.dataset.hint = hint.name;
          cell.classList.add('hint');
        }
      }
      
      cell.addEventListener('click', () => handleCellClick(r, c));
      mazeDiv.appendChild(cell);
    }
  }
  updateHeroPosition();
}

// Позициониране на героя – центриран
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

// -------------------------------------
// Вместо сегашния updateScore
async function updateScore(pointsToAdd) {
  try {
    // 1) Пусни POST към бекенда
    const res = await fetch('/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ points: pointsToAdd })
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();        // { points: newTotal }

    // 2) Обнови локалната променлива и DOM-а със стойността от сървъра
    score = data.points;
    document.getElementById('score').textContent = score;
  } catch (err) {
    console.error('Грешка при запис на точки:', err);
  }
}
// -------------------------------------
document.getElementById('score').textContent = score;


// Показване на въпрос
function showRandomFact() {
  if (!currentAuthor || !funFacts[currentAuthor] || funFacts[currentAuthor].length === 0) {
    console.warn("Няма дефинирани факти за автора:", currentAuthor);
    return;
  }

  const facts = funFacts[currentAuthor];
  const randomFact = facts[Math.floor(Math.random() * facts.length)];

  const factContent = document.getElementById('fun-fact-content');
  const factModal = document.getElementById('fun-fact-modal');

  if (factContent && factContent) {
    factContent.textContent = randomFact;
    factContent.parentElement.parentElement.classList.remove('hidden');
  }
}

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
    const textBtn = document.createElement('button');
    textBtn.textContent = "Покажи текст";
    textBtn.classList.add('btn');
    textBtn.addEventListener('click', () => {
      loadPassage(q.textId);     // <<< правилно
    });
    answersDiv.appendChild(textBtn);
    answersDiv.appendChild(document.createElement('br'));
  }
  
  
  
  // За въпроси от тип multiple_choice – използваме <span> за опции
  if (q.type === 'multiple_choice') {
    (q.options || []).forEach(opt => {
      const btn = document.createElement('button');
      btn.classList.add('answer-option'); // <-- добави този ред
      btn.textContent = `${opt.label}) ${opt.option_text}`;
      btn.addEventListener('click', () => {
        if (opt.is_correct) {
          correctSound.play().catch(err => console.error("Error playing correct sound:", err));
          alert("Правилен отговор!");
          gameQuestions.splice(randomIndex, 1);
          closeQuestionModal();
          onCorrect();
          if (Math.random() < 0.2) {
            showRandomFact();
          }
        } else {
          wrongSound.play().catch(err => console.error("Error playing wrong sound:", err));
          alert("Грешен отговор! Опитайте отново.");
        }
      });
      answersDiv.appendChild(btn);
      answersDiv.appendChild(document.createElement('br'));
    });
  } else if (q.type === 'true_false') {
    (q.options || []).forEach((opt, index) => {
      const btn = document.createElement('button');
      btn.classList.add('answer-option'); // <-- добави този ред
      btn.textContent = (index === 0 ? "А) " : "Б) ") + opt.option_text; // добавя префикс
      btn.addEventListener('click', () => {
        if (opt.is_correct) {
          correctSound.play().catch(err => console.error("Error playing correct sound:", err));
          alert("Правилен отговор!");
          gameQuestions.splice(randomIndex, 1);
          closeQuestionModal();
          onCorrect();
          if (Math.random() < 0.2) {
            showRandomFact();
          }
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
document.addEventListener('DOMContentLoaded', () => {
  const closeFactBtn = document.getElementById('close-fun-fact-btn');
  closeFactBtn.addEventListener('click', () => {
    document.getElementById('fun-fact-content').textContent = "";
    document.getElementById('fun-fact-modal').classList.add('hidden');
  });
});


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
  document
    .getElementById('register-btn')
    .addEventListener('click', () => {
      const u = document.getElementById('register-username').value;
      const e = document.getElementById('register-email').value;
      const p = document.getElementById('register-password').value;
      // TODO: validate & POST to /register…
    });
}
//Показване на паролата
function ShowRegisterPassword() {
  var x = document.getElementById("register-password");
  if (x.type === "password") {
    x.type = "text";
  } else {
    x.type = "password";
  }
}

function ShowLoginPassword() {
  var x = document.getElementById("password");
  if (x.type === "password") {
    x.type = "text";
  } else {
    x.type = "password";
  }
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
  // … в началото на document.addEventListener('DOMContentLoaded', () => {
fetch('/api/me', { credentials: 'include' })
.then(r => {
  if (!r.ok) throw new Error('not logged');
  return r.json();
})
.then(me => {
  // Ако има активна сесия, скриваме логин-модала и показваме user-info
  document.getElementById('login-modal').classList.add('hidden');
  const ui = document.getElementById('user-info');
  ui.style.display = 'block';
  document.getElementById('display-username').textContent = me.username;
  document.getElementById('score').textContent = me.points;
})
.catch(() => {
  // няма сесия – оставяме модала видим
});
// … продължава останалата част от DOMContentLoaded

  // === АУДИО ИНИЦИАЛИЗАЦИЯ ===
  backgroundMusic = new Audio('audio/epic-adventure.mp3');
  backgroundMusic.loop   = true;
  backgroundMusic.volume = 0.5;
  doorSound    = new Audio('audio/door-creak.mp3');
  doorSound.volume   = 0.2;
  correctSound = new Audio('audio/correct.mp3');
  correctSound.volume= 0.5;
  wrongSound   = new Audio('audio/wrong.mp3');
  wrongSound.volume  = 0.5;

  const volumeControl = document.getElementById('volume-control');
  if (volumeControl) {
    volumeControl.addEventListener('input', function() {
      const vol = parseFloat(this.value);
      backgroundMusic.volume = vol;
      doorSound.volume       = vol;
      correctSound.volume    = vol;
      wrongSound.volume      = vol;
    });
  }

  // === МОДАЛИ (НВО, PRAVILA, QUESTIONS) ===
  const nvoBtn       = document.getElementById('nvo-btn');
  const nvoModal     = document.getElementById('nvo-modal');
  const nvoCloseBtn  = document.getElementById('nvo-close-btn');
  const nvoSelectBtn = document.getElementById('nvo-select-btn');
  if (nvoBtn && nvoModal) {
    nvoBtn.addEventListener('click', () => {
      nvoModal.classList.toggle('visible');
      nvoModal.classList.toggle('hidden');
    });
  }
  if (nvoCloseBtn && nvoModal) {
    nvoCloseBtn.addEventListener('click', () => {
      nvoModal.classList.add('hidden');
      nvoModal.classList.remove('visible');
    });
  }
  if (nvoSelectBtn) {
    nvoSelectBtn.addEventListener('click', () => {
      const sel = document.getElementById('nvo-year-select');
      const key = sel?.value;
      if (!key) {
        alert('Моля, изберете година!');
        return;
      }
      nvoModal.classList.add('hidden');
      nvoModal.classList.remove('visible'); 
      selectAuthor(key);
    });
  }

  // === TOGGLE МУЗИКА ===
  const musicToggleBtn = document.getElementById('music-toggle-btn');
  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', () => {
      if (backgroundMusic.paused) {
        backgroundMusic.play();
        musicPaused = false;
        musicToggleBtn.textContent = 'Пауза музика';
      } else {
        backgroundMusic.pause();
        musicPaused = true;
        musicToggleBtn.textContent = 'Възпроизведи музика';
      }
    });
  }

  // === LOGIN / REGISTER ===
  const loginModal    = document.getElementById('login-modal');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn      = document.getElementById('login-btn');
  const showPassCb    = document.getElementById('show-password-checkbox');
  const registerLink  = document.getElementById('open-register-from-login');
  const registerModal = document.getElementById('register-modal');
  const registerBtn   = document.getElementById('register-btn');
  const closeRegBtn   = document.getElementById('close-register-btn');

  // Покажи/скрий паролата
  if (showPassCb && passwordInput) {
    showPassCb.addEventListener('change', () => {
      passwordInput.type = showPassCb.checked ? 'text' : 'password';
    });
  }

  // Login
  if (loginBtn && usernameInput && passwordInput) {
    document.getElementById('login-btn').addEventListener('click', async () => {
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      if (!username || !password) {
        return alert('Моля, въведете потребителско име и парола.');
      }
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error(await res.text());
        alert(await res.text()); // „Успешен вход!“
    
        // Скриваме модала
        const loginModal = document.getElementById('login-modal');
        // loginModal.classList.add('hidden');
        loginModal.classList.remove('visible');
loginModal.classList.add('hidden');

    
        // Показваме user-info
        const ui = document.getElementById('user-info');
        ui.style.display = 'block';
        document.getElementById('display-username').textContent = username;
    
        // Актуализираме точките
        const me = await (await fetch('/api/me', { credentials: 'include' })).json();
        document.getElementById('score').textContent = me.points;
    
        // Обновяваме списъка онлайн
        loadOnline();
      } catch (err) {
        alert(err.message);
      }
    });
    
  }

  // === КАРТИ & ЛАБИРИНТ ===
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      card.querySelector('.card-inner')?.classList.toggle('flipped');
    });
  });
  document.querySelectorAll('.enter-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const author = btn.closest('.card')?.dataset.author;
      if (author) selectAuthor(author);
    });
  });
  const backBtn = document.getElementById('back-to-authors');
  if (backBtn) backBtn.addEventListener('click', () => {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    currentAuthor = null;
    currentLevel  = 1;
    // score         = 0;
    // document.getElementById('score').textContent = score;
    document.getElementById('current-level').textContent = currentLevel;
    document.getElementById('labyrinth-title').textContent = 'Лабиринт';
    document.getElementById('author-selection').classList.remove('hidden');
    document.getElementById('game-container').classList.add('hidden');
  });

  document.addEventListener('keydown', e => {
    const moves = {
      ArrowUp:    { dr: -1, dc: 0 },
      ArrowDown:  { dr: 1,  dc: 0 },
      ArrowLeft:  { dr: 0,  dc: -1 },
      ArrowRight: { dr: 0,  dc: 1 }
    };
    if (moves[e.key]) {
      const { dr, dc } = moves[e.key];
      const nr = playerPos.row + dr;
      const nc = playerPos.col + dc;
      if (
        nr >= 0 && nr < currentMaze.length &&
        nc >= 0 && nc < currentMaze[0].length &&
        revealedMaze[nr][nc] === 0
      ) {
        movePlayer(nr, nc);
      }
    }
  });

  document.getElementById('next-level')?.addEventListener('click', () => {
    if (currentLevel < MAX_LEVEL) {
      currentLevel++;
      document.getElementById('current-level').textContent = currentLevel;
      loadMazeLevel(currentAuthor, currentLevel);
      document.getElementById('next-level').classList.add('hidden');
    } else {
      alert('Поздравления, приключихте всички нива!');
    }
  });

  const rulesModal = document.getElementById('rules-modal');
  document.getElementById('rules-btn')?.addEventListener('click', () => rulesModal.classList.remove('hidden'));
  document.getElementById('close-rules')?.addEventListener('click', () => rulesModal.classList.add('hidden'));
  document.getElementById('close-question-btn')?.addEventListener('click', closeQuestionModal);

  // === ONLINE USERS LIVE UPDATE ===
  async function loadOnline() {
    try {
      const res = await fetch('/api/online-users', { credentials: 'include' });
      if (!res.ok) {
        console.error('Грешка при зареждане на online users:', res.status);
        return;
      }
      const users = await res.json();
      if (!Array.isArray(users)) {
        console.error('Невалиден отговор от /api/online-users:', users);
        return;
      }
      document.getElementById('online-list').innerHTML =
        users.map(u => `<li>${u.username} – ${u.points} точки</li>`).join('');
    } catch (err) {
      console.error('Грешка в loadOnline():', err);
    }
  }

  // пускаме веднага и на всеки 5 секунди
  loadOnline();
  setInterval(loadOnline, 5000);
});



