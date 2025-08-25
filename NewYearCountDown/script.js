let dayBox = document.getElementById("day-box");
let hrBox = document.getElementById("hr-box");
let minBox = document.getElementById("min-box");
let secBox = document.getElementById("sec-box");

if (!dayBox || !hrBox || !minBox || !secBox) {
    console.error("Required countdown elements not found");
}

// Function to update the heading with the target year
function updateHeading() {
  let currentYear = new Date().getFullYear();
  let nextYear = currentYear + 1;
  let heading = document.querySelector(".heading h1");
  if (heading) {
    heading.textContent = nextYear;
  }
}

function countdown() {
  let currentYear = new Date().getFullYear();
  let nextYear = currentYear + 1;
  let endDate = new Date(nextYear, 0, 1, 0, 0);
  let endTime = endDate.getTime();

  let todayDate = new Date();
  let todayTime = todayDate.getTime();
  let remainingTime = endTime - todayTime;
  let oneMin = 60 * 1000;
  let oneHr = 60 * oneMin;
  let oneDay = 24 * oneHr;

  let addZeroes = (num) => (num < 10 ? `0${num}` : num);

  if (endTime < todayTime) {
    clearInterval(i);
    document.querySelector(".countdown").innerHTML = `<h1>Countdown Has Expired</h1>`;
  } else {
    let daysLeft = Math.floor(remainingTime / oneDay);
    let hrsLeft = Math.floor((remainingTime % oneDay) / oneHr);
    let minsLeft = Math.floor((remainingTime % oneHr) / oneMin);
    let secsLeft = Math.floor((remainingTime % oneMin) / 1000);

    if (dayBox && hrBox && minBox && secBox) {
      dayBox.textContent = addZeroes(daysLeft);
      hrBox.textContent = addZeroes(hrsLeft);
      minBox.textContent = addZeroes(minsLeft);
      secBox.textContent = addZeroes(secsLeft);
    }
  }
}

updateHeading(); // Update the heading initially
let i = setInterval(countdown, 1000);
countdown();
