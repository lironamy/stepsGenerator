import { getVibrationPattern } from './VibrationPattern.js';
import { getSuctionPattern } from './SuctionPattern.js';
import { getVibrationIntensity } from './VibrationIntensity.js';
import { getSuctionIntensity } from './SuctionIntensity.js';

fetch('questions.json')
    .then(response => response.json())
    .then(data => {
        const questionsArray = data.questions; 
        if (Array.isArray(questionsArray)) {
            displayQuestions(questionsArray);
        } else {
            throw new Error('The fetched data does not contain an array of questions');
        }
    })
    .catch(error => console.error('Error:', error));

function displayQuestions(questions) {
    const container = document.getElementById('questions-container');
    questions.forEach((questionObj, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.classList.add('question');

        const questionText = document.createElement('h2');
        questionText.textContent = questionObj.question;
        questionDiv.appendChild(questionText);

        if (questionObj.possible_answers) {
            questionObj.possible_answers.forEach(answerObj => {
                const answerDiv = document.createElement('div');
                answerDiv.classList.add('answer');

                const answerLabel = document.createElement('label');

                if (questionObj.type === 'multiple' && answerObj['Answer_translation']) {
                    let translation = answerObj['Answer_translation'][0];
                    let levels = answerObj['Answer_translation'].length;
                    const slider = document.createElement('input');
                    slider.type = 'range';
                    slider.min = 1;
                    slider.max = levels;
                    slider.value = translation.Answer;

                    answerLabel.textContent = answerObj.possible_answers;
                    answerDiv.appendChild(answerLabel);

                    const sliderValue = document.createElement('span');
                    sliderValue.textContent = slider.value;
                    slider.addEventListener('input', () => {
                        sliderValue.textContent = slider.value;
                    });

                    answerDiv.appendChild(slider);
                    answerDiv.appendChild(sliderValue);
                } else if (questionObj.type === 'single') {
                    const radioButton = document.createElement('input');
                    radioButton.type = 'radio';
                    radioButton.name = `question${index}`;
                    radioButton.value = answerObj.Answer;

                    radioButton.setAttribute('data-translation', JSON.stringify(answerObj['Answer_translation']));

                    answerLabel.appendChild(radioButton);
                    answerLabel.append(answerObj.Answer);
                    answerDiv.appendChild(answerLabel);
                }
                questionDiv.appendChild(answerDiv);
            });
        } else {
            const noAnswerDiv = document.createElement('div');
            noAnswerDiv.classList.add('no-answer');
            noAnswerDiv.textContent = 'No possible answers available';
            questionDiv.appendChild(noAnswerDiv);
        }

        container.appendChild(questionDiv);
    });
}

function getAnswers() {
    const questions = document.querySelectorAll('.question');
    return Array.from(questions).map((question, index) => {
        const questionText = question.querySelector('h2').textContent;

        const answerDivs = question.querySelectorAll('.answer');
        let answers = {};
        let type = '';

        // Check for range input (multiple choice with slider)
        if (answerDivs[0].querySelector('input[type="range"]')) {
            type = 'multiple';

            answerDivs.forEach(answerDiv => {
                const label = answerDiv.querySelector('label').textContent.trim();
                const rangeInput = answerDiv.querySelector('input[type="range"]');
                answers[label] = rangeInput.value;
            });

        } else {
            // Single-choice question (radio button)
            type = 'single';
            const radioInput = question.querySelector('input[type="radio"]:checked');
            
            if (radioInput) {
   
                answers = radioInput.value;
                const translation = safeJSONParse(radioInput.getAttribute('data-translation'));
                
                // Return with translation for single-choice questions
                return { question: questionText, type, answers, translation };
            } else {
                console.warn(`No radio button selected for question: ${questionText}`);
            }
        }

        // Return the answers for multiple-choice questions
        return { question: questionText, type, answers };
    });
}

// Utility function for safe JSON parsing
function safeJSONParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error('Error parsing JSON:', e);
        return null;
    }
}




async function fetchAndApplyAnswers() {
    try {
        const response = await fetch('http://localhost:3000/setanswers');
        const { data: answersData } = await response.json();
        applyAnswers(answersData);
    } catch (error) {
        console.error('Error fetching answers:', error);
        showError('Failed to load saved answers. Please try again later.');
    }
}

function applyAnswers(answers) {
    const questionDivs = document.querySelectorAll('.question');
    
    answers.forEach(answer => {
        const matchingQuestionDiv = Array.from(questionDivs).find(div => 
            div.querySelector('h2').textContent.trim() === answer.question.trim()
        );

        if (matchingQuestionDiv) {
            if (answer.type === 'multiple') {
                applyMultipleChoiceAnswer(matchingQuestionDiv, answer);
            } else if (answer.type === 'single') {
                applySingleChoiceAnswer(matchingQuestionDiv, answer);
            }
        }
    });
}


function applyMultipleChoiceAnswer(questionDiv, answer) {
    const answerDivs = questionDiv.querySelectorAll('.answer');
    answerDivs.forEach(answerDiv => {
        const label = answerDiv.querySelector('label').textContent.trim();
        const slider = answerDiv.querySelector('input[type="range"]');
        if (slider && answer.answers) {
            const matchingAnswer = answer.answers.find(ans => ans.possible_answers === label);
            if (matchingAnswer) {
                slider.value = matchingAnswer.answer_id;
                answerDiv.querySelector('span').textContent = slider.value;
            }
        }
    });
}

function applySingleChoiceAnswer(questionDiv, answer) {

    const radioInputs = questionDiv.querySelectorAll('input[type="radio"]');
    
    for (let radioInput of radioInputs) {
        const answerTranslation = safeJSONParse(radioInput.getAttribute('data-translation'));
        const answerData = safeJSONParse(radioInput.getAttribute('data-answer-data'));

        
        if (answer.question.includes("What are your hrausel preferences?")) {
            // Handle hrausel preferences case
            if (answerData && answerData.patterns === answer.answer_id) {
                radioInput.checked = true;
                break;
            } else if (Array.isArray(answerTranslation) && 
                       Array.isArray(answer.answer_id) &&
                       answerTranslation.length === answer.answer_id.length &&
                       answerTranslation.every((val, index) => val === answer.answer_id[index])) {
                radioInput.checked = true;
                break;
            }
        } else {
            // Handle other single-choice questions
            if (answerTranslation === answer.answer_id) {
                radioInput.checked = true;
                break;
            }
        }
    }
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: message,
    });
}





function calculateAndDisplayResult(heatLevelExt, heatLevelInt, hrauselPreference, intimacyStartValue, diversity, intenseLvlStartValue, ExternalLubricationLevel, intimacyMidwayValue, intenseLvlMidwayValue, intenseLvlEndValue, intimacyEndValue) {
    const heatValueExt = heatLevelExt;
    const heatValueInt = heatLevelInt;
    const hrauselValues = hrauselPreference;
    const intimacyStart = parseInt(intimacyStartValue);
    const intimacyMidway = parseInt(intimacyMidwayValue);
    const intimacyEnd = parseInt(intimacyEndValue);
    const intenseLvlStart = parseInt(intenseLvlStartValue);
    const intenseLvlMidway = parseInt(intenseLvlMidwayValue);
    const intenseLvlEnd = parseInt(intenseLvlEndValue);
    const diversityValue = parseInt(diversity);
    const externalLubricationLevel = parseInt(ExternalLubricationLevel);
    const externalDesiredTemperature = heatValueExt * hrauselValues[1];
    const internalDesiredTemperature = heatValueInt * hrauselValues[0];
    const extLub = externalLubricationLevel * hrauselValues[1];
    const intLub = externalLubricationLevel * hrauselValues[0];
    const tableBody = document.getElementById('tdresults');
    tableBody.innerHTML = '';  
    const patternsStartOne = 1;
    const patternsStartTwo = 2;
    const patternsStartThree = 3;
    const patternsStartFour = 4;

    for (let i = 0; i < 120; i++) {
        const sectionClass = i < 40 ? 'start' : i < 80 ? 'midway' : 'end';
        
        const row = createTableRow(
            sectionClass,
            i + 1,
            externalDesiredTemperature,
            internalDesiredTemperature,
            getVibrationPattern(i, patternsStartOne, patternsStartTwo, patternsStartThree, patternsStartFour, hrauselValues, diversityValue),
            getVibrationIntensity(i, intenseLvlStart, intimacyStart, intenseLvlMidway, intimacyMidway, intimacyEnd, intenseLvlEnd, hrauselValues),
            getSuctionPattern(i, patternsStartOne, patternsStartTwo, patternsStartThree, patternsStartFour, hrauselValues, diversityValue),
            getSuctionIntensity(i, intenseLvlStart, intimacyStart, intenseLvlMidway, intimacyMidway, intimacyEnd, intenseLvlEnd, hrauselValues),
            extLub,
            intLub
        );
        tableBody.appendChild(row);
    }
}

function createTableRow(sectionClass, step, externalTemp, internalTemp, vibrationPatterns, vibrationIntensity, suctionPatterns, suctionIntensity, extLub, intLub) {
    const row = document.createElement('tr');
    row.classList.add(sectionClass);

    const cellSection = document.createElement('td');
    cellSection.textContent = sectionClass;
    row.appendChild(cellSection);

    const cellStep = document.createElement('td');
    cellStep.textContent = step;
    row.appendChild(cellStep);

    const cellTime = document.createElement('td');
    cellTime.textContent = '5 sec';
    row.appendChild(cellTime);

    const cellExternalDesiredTemp = document.createElement('td');
    cellExternalDesiredTemp.textContent = externalTemp;
    row.appendChild(cellExternalDesiredTemp);

    const cellInternalDesiredTemp = document.createElement('td');
    cellInternalDesiredTemp.textContent = internalTemp;
    row.appendChild(cellInternalDesiredTemp);

    vibrationPatterns.forEach(pattern => {
        const cellPattern = document.createElement('td');
        cellPattern.textContent = pattern;
        row.appendChild(cellPattern);
    });

    vibrationIntensity.forEach(intensity => {
        const cellIntensity = document.createElement('td');
        cellIntensity.textContent = intensity > 10 ? 10 : intensity;
        row.appendChild(cellIntensity);
    });

    suctionPatterns.forEach(pattern => {
        const cellPattern = document.createElement('td');
        cellPattern.textContent = pattern;
        row.appendChild(cellPattern);
    });

    suctionIntensity.forEach(intensity => {
        const cellIntensity = document.createElement('td');
        cellIntensity.textContent = intensity > 10 ? 10 : intensity;
        row.appendChild(cellIntensity);
    });

    const cellExtLubLevel = document.createElement('td');
    cellExtLubLevel.textContent = extLub;
    row.appendChild(cellExtLubLevel);

    const cellIntLubLevel = document.createElement('td');
    cellIntLubLevel.textContent = intLub;
    row.appendChild(cellIntLubLevel);

    return row;
}


document.addEventListener('DOMContentLoaded', function () {
    if (typeof questions !== 'undefined') {
        displayQuestions(questions); 
    } else {
        console.error('Questions data is not available.');
    }

    fetchAndApplyAnswers();

    const submitButton = document.getElementById('button');
    const downloadButton = document.getElementById('download');

    if (submitButton) {
        submitButton.addEventListener('click', function () {
            const answers = getAnswers();

            const clampToMax = (value, max) => {
                let num;
                if (Array.isArray(value)) {
                    num = value.map(v => parseFloat(v));
                } else if (typeof value === 'string') {
                    num = parseFloat(value);
                } else if (typeof value === 'number') {
                    num = value;
                } else {
                    num = 0; 
                }
                if (Array.isArray(num)) {
                    return num.map(v => isNaN(v) ? 0 : Math.min(v, max));
                } else {
                    return isNaN(num) ? 0 : Math.min(num, max);
                }
            };

            let heatLevelExt, heatLevelInt, hrauselPreference, intimacyStartValue, intimacyMidwayValue, intimacyEndValue;
            let diversityValue, intenseLvlStartValue, intenseLvlMidwayValue, intenseLvlEndValue, ExternalLubricationLevel;

            answers.forEach(answer => {
                const translation = answer.translation;

                if (answer.question.includes("Which heat level takes your pleasure up a notch?")) {
                    heatLevelExt = clampToMax(translation, 42);
                    heatLevelInt = clampToMax(translation, 42);
                } else if (answer.question.includes("What are your hrausel preferences?")) {
                    hrauselPreference = Array.isArray(translation) ? translation : [1, 1]; // Default to [1, 1] if not an array
                } else if (answer.question.includes("How would you articulate your ideal intimacy")) {
                    intimacyStartValue = clampToMax(answer.answers?.["Start"], 10);
                    intimacyMidwayValue = clampToMax(answer.answers?.["Midway"], 10);
                    intimacyEndValue = clampToMax(answer.answers?.["End"], 10);
                } else if (answer.question.includes("How much do you love diversity in your sexual experiences?")) {
                    diversityValue = clampToMax(translation, 10);
                } else if (answer.question.includes("How intense do you like each part of the program to be?")) {
                    intenseLvlStartValue = clampToMax(answer.answers?.["Start"], 10);
                    intenseLvlMidwayValue = clampToMax(answer.answers?.["Midway"], 10);
                    intenseLvlEndValue = clampToMax(answer.answers?.["End"], 10);
                } else if (answer.question.includes("How much lube would make your journey to pleasure smoother?")) {
                    ExternalLubricationLevel = clampToMax(translation, 10);
                }
            });

            if (heatLevelExt !== undefined && hrauselPreference !== undefined && intimacyStartValue !== undefined && diversityValue !== undefined && intenseLvlStartValue !== undefined && ExternalLubricationLevel !== undefined) {
                calculateAndDisplayResult(
                    heatLevelExt, heatLevelInt, hrauselPreference, intimacyStartValue, diversityValue,
                    intenseLvlStartValue, ExternalLubricationLevel, intimacyMidwayValue,
                    intenseLvlMidwayValue, intenseLvlEndValue, intimacyEndValue
                );
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: `You have not answered all the questions. Please answer all the questions to see the results.`,
                });
                console.error('Required answers not found or are incomplete.');
            }
        });
    } else {
        console.error('Submit button not found.');
    }

    if (downloadButton) {
        downloadButton.addEventListener('click', function () {
            if (document.getElementById('tdresults').rows.length > 0) {
                downloadTable();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: `Please click on the submit button to generate the results before downloading the table.`,
                });
            }
        });
    } else {
        console.error('Download button not found.');
    }
});

function downloadTable() {
    const table = document.getElementById('tdresults');
    if (!table) {
        console.error('Table with ID "result-table" not found.');
        return;
    }

    const rows = table.rows;
    const result = [];

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].cells;
        const row = {
            section: cells[0].textContent,
            step: cells[1].textContent,
            time: cells[2].textContent,
            externalDesiredTemp: cells[3].textContent,
            internalDesiredTemp: cells[4].textContent,
            vibrationPattern: cells[5].textContent,
            vibrationIntensity: cells[6].textContent,
            suctionPattern: cells[7].textContent,
            suctionIntensity: cells[8].textContent,
            extLub: cells[9].textContent,
            intLub: cells[10].textContent
        };
        result.push(row);
    }

    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'result.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
