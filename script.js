document.addEventListener('DOMContentLoaded', () => {
    // Добавляем поддержку drag-and-drop для всех зон загрузки
    const dropZones = [
        document.getElementById('uploadBox'),
        document.getElementById('compare1Upload'),
        document.getElementById('compare2Upload')
    ];

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const input = zone.querySelector('input[type="file"]');
                input.files = e.dataTransfer.files;
                input.dispatchEvent(new Event('change'));
            }
        });
    });

    // Навигация
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.page.active').classList.remove('active');
            document.querySelector(link.getAttribute('href')).classList.add('active');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Форма обратной связи
    const feedbackForm = document.getElementById('feedbackForm');
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = feedbackForm.querySelector('input[name="email"]').value;
        const message = feedbackForm.querySelector('textarea[name="message"]').value;
        
        const mailtoLink = `mailto:estenyolo7@gmail.com?subject=Обратная связь с сайта EmoAI&body=${encodeURIComponent(`От: ${email}\n\nСообщение:\n${message}`)}`;
        window.location.href = mailtoLink;
        
        feedbackForm.style.display = 'none';
        const successMessage = document.getElementById('successMessage');
        successMessage.classList.remove('hidden');
        setTimeout(() => {
            successMessage.style.opacity = '1';
            successMessage.style.transform = 'translateY(0)';
        }, 100);
        
        setTimeout(() => {
            hideModal('contact');
            setTimeout(() => {
                feedbackForm.reset();
                feedbackForm.style.display = 'block';
                successMessage.classList.add('hidden');
                successMessage.style.opacity = '0';
                successMessage.style.transform = 'translateY(20px)';
            }, 300);
        }, 3000);
    });

    // Распознавание эмоций
    const imageInput = document.getElementById('imageInput');
    imageInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            try {
                const startTime = performance.now();
                const img = await faceapi.bufferToImage(file);
                document.getElementById('previewImage').src = img.src;
                document.getElementById('uploadBox').classList.add('hidden');
                const resultBox = document.getElementById('resultBox');
                resultBox.classList.remove('hidden');

                // Загружаем модели по требованию
                if (!faceapi.nets.tinyFaceDetector.isLoaded) {
                    document.getElementById('emotionResult').textContent = 'Загрузка моделей...';
                    await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
                    await faceapi.nets.faceExpressionNet.loadFromUri('./models');
                    await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
                }

                const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceExpressions();

                const endTime = performance.now();
                const processingTime = Math.round(endTime - startTime) / 1000;

                if (detections && detections.length > 0) {
                    const expressions = detections[0].expressions;
                    let maxExpression = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b);
                    const emotionName = maxExpression[0];
                    const confidence = maxExpression[1];
                    
                    const translatedEmotion = translateEmotion(emotionName);
                    const emoji = getEmojiForEmotion(emotionName);
                    
                    document.getElementById('emotionResult').textContent = translatedEmotion;
                    document.getElementById('emotionIcon').textContent = emoji;
                    document.getElementById('confidenceLevel').textContent = `${Math.round(confidence * 100)}%`;
                    document.getElementById('processingTime').textContent = `${processingTime} сек`;
                    
                    resultBox.classList.add('active');
                } else {
                    throw new Error('Лицо не обнаружено');
                }
            } catch (error) {
                alert(error.message);
                document.getElementById('uploadBox').classList.remove('hidden');
                document.getElementById('resultBox').classList.add('hidden');
            }
        }
    });

    // Обработка загрузки файлов для сравнения
    const compareInputs = document.querySelectorAll('.compare-input');
    compareInputs.forEach((input, index) => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById(`comparePreview${index + 1}`).src = event.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    });
});

// Сравнение лиц
async function compareFaces() {
    const input1 = document.querySelector('#compare1Upload .compare-input');
    const input2 = document.querySelector('#compare2Upload .compare-input');

    if (!input1.files[0] || !input2.files[0]) {
        alert('Пожалуйста, загрузите оба изображения');
        return;
    }

    try {
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
            const similarityResult = document.getElementById('similarityResult');
            similarityResult.textContent = 'Загрузка моделей...';
            similarityResult.classList.remove('hidden');
            
            await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
        }

        const img1 = await faceapi.bufferToImage(input1.files[0]);
        const img2 = await faceapi.bufferToImage(input2.files[0]);

        const detection1 = await faceapi.detectSingleFace(img1, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        const detection2 = await faceapi.detectSingleFace(img2, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection1 || !detection2) {
            throw new Error('Не удалось обнаружить лицо на одном или обоих изображениях');
        }

        const distance = faceapi.euclideanDistance(detection1.descriptor, detection2.descriptor);
        const similarity = Math.round((1 - Math.min(distance, 1)) * 100);

        const similarityResult = document.getElementById('similarityResult');
        document.getElementById('similarityValue').textContent = `${similarity}%`;
        similarityResult.classList.remove('hidden');
    } catch (error) {
        alert(error.message);
    }
}

// Вспомогательные функции
function translateEmotion(emotion) {
    const emotions = {
        neutral: 'Нейтральная',
        happy: 'Радость',
        sad: 'Грусть',
        angry: 'Злость',
        fearful: 'Страх',
        disgusted: 'Отвращение',
        surprised: 'Удивление'
    };
    return emotions[emotion] || emotion;
}

function getEmojiForEmotion(emotion) {
    const emojis = {
        happy: '😊',
        sad: '😢',
        angry: '😠',
        surprised: '😲',
        fearful: '😨',
        disgusted: '🤢',
        neutral: '😐'
    };
    return emojis[emotion] || '';
}

function showModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function hideModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}