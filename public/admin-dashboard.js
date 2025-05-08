function loadRegistrations() { /*…*/ }
function loadGlobalScore() { /*…*/ }

setInterval(() => {
  loadRegistrations();
  loadGlobalScore();
}, 5000);

// стартираме наведнъж при зареждане
loadRegistrations();
loadGlobalScore();
