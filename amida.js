document.addEventListener('DOMContentLoaded', () => {
    const INPUT_COUNT = 12; // 参加者数
    const CANVAS_WIDTH = 900;
    const CANVAS_HEIGHT = 600;
    const COLUMN_SPACING = CANVAS_WIDTH / (INPUT_COUNT + 1); // 縦線間の間隔
    const DOT_RADIUS = 8;
    const ANIMATION_SPEED = 2; // ドットの移動速度 (px/フレーム)

    const setupArea = document.getElementById('setup-area');
    const inputContainer = document.getElementById('input-container');
    const startButton = document.getElementById('start-button');
    const gameArea = document.getElementById('game-area');
    const startLabelsDiv = document.getElementById('start-labels');
    const endLabelsDiv = document.getElementById('end-labels');
    const canvas = document.getElementById('amida-canvas');
    const ctx = canvas.getContext('2d');
    const finalResultDisplay = document.getElementById('final-result-display');
    const resultList = document.getElementById('result-list');
    const resetButton = document.getElementById('reset-button');

    // Canvasのサイズを設定
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let participants = []; // 参加者名
    let ladderData = [];   // あみだくじの横線データ
    let dots = [];         // アニメーション中の各参加者のドット
    let animationFrameId;  // requestAnimationFrameのID

    // --- 初期設定 ---
    function initialize() {
        // 入力フィールドの生成
        inputContainer.innerHTML = '';
        for (let i = 0; i < INPUT_COUNT; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `名前 ${i + 1}`;
            input.id = `participant-name-${i}`;
            inputContainer.appendChild(input);
        }

        // 初期表示
        setupArea.style.display = 'block';
        gameArea.style.display = 'none';
        finalResultDisplay.style.display = 'none';
        startButton.disabled = false;
        inputContainer.querySelectorAll('input').forEach(input => input.disabled = false);
        
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Canvasをクリア
    }

    // --- イベントリスナー ---
    startButton.addEventListener('click', startGame);
    resetButton.addEventListener('click', resetGame);

    // --- ゲーム開始処理 ---
    function startGame() {
        participants = [];
        for (let i = 0; i < INPUT_COUNT; i++) {
            const nameInput = document.getElementById(`participant-name-${i}`);
            participants.push(nameInput.value.trim() || `名無し${i + 1}`);
        }

        // シャッフルされた参加者名（ゴール順を決める）
        const shuffledParticipants = shuffleArray([...participants]);
        // ゴールに表示される結果をセット
        endLabelsDiv.innerHTML = shuffledParticipants.map((name, index) => 
            `<div class="label-item" style="left: ${calculateColumnX(index + 1)}px;">${index + 1}番</div>`
        ).join('');

        // あみだくじの線を生成
        ladderData = generateLadder(INPUT_COUNT, CANVAS_HEIGHT);

        // 各参加者の初期ドット設定
        dots = participants.map((name, index) => ({
            id: index,
            name: name,
            x: calculateColumnX(index + 1), // 初期X座標
            y: 0,                           // 初期Y座標 (Canvasの最上部)
            currentColumn: index + 1,       // 現在の縦線番号 (1始まり)
            movingDirection: 'down',        // 'down', 'left', 'right'
            targetX: null,                  // 横線移動の目標X座標
            finished: false,                // ゴールに到達したか
            finalRank: null,                // 最終順位
            color: getRandomColor()         // ドットの色
        }));

        // UIの切り替え
        setupArea.style.display = 'none';
        gameArea.style.display = 'flex'; // flexにしてラベルを配置
        finalResultDisplay.style.display = 'none';

        // スタートラベルの表示
        startLabelsDiv.innerHTML = participants.map((name, index) => 
            `<div class="label-item" style="left: ${calculateColumnX(index + 1)}px;">${name}</div>`
        ).join('');
        
        // アニメーション開始
        animateAmida();
    }

    // --- ゲームリセット処理 ---
    function resetGame() {
        cancelAnimationFrame(animationFrameId); // 現在のアニメーションを停止
        initialize(); // 初期状態に戻す
    }

    // --- Canvas描画関数 ---
    function draw() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 縦線を描画
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        for (let i = 1; i <= INPUT_COUNT; i++) {
            const x = calculateColumnX(i);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
        }

        // 横線（ハシゴ）を描画
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ladderData.forEach(ladder => {
            const x1 = calculateColumnX(ladder.col1);
            const x2 = calculateColumnX(ladder.col2);
            ctx.beginPath();
            ctx.moveTo(x1, ladder.y);
            ctx.lineTo(x2, ladder.y);
            ctx.stroke();
        });

        // ドットと名前を描画
        dots.forEach(dot => {
            if (dot.finished) return; // ゴールしたドットは描画しない

            // ドット
            ctx.fillStyle = dot.color;
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // 名前（ドットの上）
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(dot.name, dot.x, dot.y - DOT_RADIUS - 2);
        });
    }

 // ... (前略：DOT_RADIUS, ANIMATION_SPEED, ladderDataなどの定義はそのまま) ...

// --- アニメーションループ (修正版) ---
function animateAmida() {
    let allFinished = true;

    dots.forEach(dot => {
        if (dot.finished) return;

        allFinished = false;

        // 1. 横移動中
        if (dot.movingDirection === 'left' || dot.movingDirection === 'right') {
            const isMovingRight = dot.movingDirection === 'right';
            dot.x += isMovingRight ? ANIMATION_SPEED : -ANIMATION_SPEED;

            // 目標X座標に到達したかチェック (誤差を許容し、強制的に固定する)
            const reachedTarget = isMovingRight ? (dot.x >= dot.targetX) : (dot.x <= dot.targetX);

            if (reachedTarget) {
                dot.x = dot.targetX; // 目標Xに固定
                dot.movingDirection = 'down'; // 下移動に切り替え
                dot.targetX = null;
            }
        }
        
        // 2. 下移動中 (または横移動が終わった瞬間)
        if (dot.movingDirection === 'down') {
            dot.y += ANIMATION_SPEED;
            
            // ゴールライン到達チェック
            if (dot.y >= CANVAS_HEIGHT) {
                dot.y = CANVAS_HEIGHT;
                dot.finished = true;
                dot.finalRank = dot.currentColumn;
                return; // ゴールしたのでこのドットの処理は終了
            }

            // 次のフレームで衝突する可能性のある横線を見つける
            // 現在のY座標から、移動先のY座標の範囲内にある横線をチェック
            const nextY = dot.y + ANIMATION_SPEED;
            const hitLadders = ladderData.filter(l => 
                // 横線が現在のY座標と次のY座標の間にあるか
                l.y > dot.y && l.y <= nextY && 
                // ドットが現在いる縦線に接続しているか
                (l.col1 === dot.currentColumn || l.col2 === dot.currentColumn)
            );

            if (hitLadders.length > 0) {
                // 最も近い横線を選択
                const hitLadder = hitLadders.reduce((a, b) => a.y < b.y ? a : b); 
                
                dot.y = hitLadder.y; // 横線のY座標に固定

                // どちらの方向に移動するか決定
                if (hitLadder.col1 === dot.currentColumn) {
                    dot.movingDirection = 'right';
                    dot.targetX = calculateColumnX(hitLadder.col2);
                    dot.currentColumn = hitLadder.col2; // 移動先の列を更新
                } else { 
                    dot.movingDirection = 'left';
                    dot.targetX = calculateColumnX(hitLadder.col1);
                    dot.currentColumn = hitLadder.col1; // 移動先の列を更新
                }
            }
        }
    });

    draw();

    if (allFinished) {
        cancelAnimationFrame(animationFrameId);
        showFinalResults();
    } else {
        animationFrameId = requestAnimationFrame(animateAmida);
    }
}
// ... (後略：他の関数はそのまま) ...
    // --- あみだくじ生成ロジック ---
    function generateLadder(cols, height) {
        const ladderLines = [];
        const numHorizontalLines = (cols - 1) * 3; // 各列間に平均3本の横線

        // Y座標を均等に分割し、その付近に横線を配置
        const segmentHeight = height / (numHorizontalLines + 1);

        for (let i = 0; i < numHorizontalLines; i++) {
            // どの列間に横線を引くか (1からcols-1の範囲)
            const colIndex = Math.floor(Math.random() * (cols - 1)) + 1; // 列番号1-11
            const yPos = segmentHeight * (i + 1) + (Math.random() * segmentHeight * 0.5 - segmentHeight * 0.25); // 区間の中心から±25%

            // Y座標がCanvas範囲内か確認
            const safeY = Math.max(DOT_RADIUS * 2, Math.min(height - DOT_RADIUS * 2, yPos));

            ladderLines.push({
                col1: colIndex,
                col2: colIndex + 1,
                y: safeY
            });
        }

        // 横線が重ならないようにソートして調整 (簡易版)
        // 厳密な重なり回避はもっと複雑なアルゴリズムが必要ですが、ここではY座標でソート
        ladderLines.sort((a, b) => a.y - b.y);

        // 連続するY座標が近すぎる場合は調整 (簡易版)
        for (let i = 0; i < ladderLines.length - 1; i++) {
            if (Math.abs(ladderLines[i].y - ladderLines[i+1].y) < DOT_RADIUS * 2 + ANIMATION_SPEED * 2) {
                ladderLines[i+1].y = ladderLines[i].y + DOT_RADIUS * 2 + ANIMATION_SPEED * 2;
                if (ladderLines[i+1].y > height - DOT_RADIUS * 2) { // 画面外に出ないように
                    ladderLines[i+1].y = height - DOT_RADIUS * 2;
                }
            }
        }

        return ladderLines;
    }

    // --- ヘルパー関数 ---
    function calculateColumnX(colNumber) {
        return colNumber * COLUMN_SPACING;
    }

    // 配列シャッフル関数（フィッシャー・イェーツのシャッフルアルゴリズム）
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // ランダムな色を生成
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // --- 最終結果表示 ---
    function showFinalResults() {
        gameArea.style.display = 'none';
        finalResultDisplay.style.display = 'block';

        resultList.innerHTML = '';
        // 最終順位でソート
        const sortedResults = dots.sort((a, b) => a.finalRank - b.finalRank);

        sortedResults.forEach(dot => {
            const li = document.createElement('li');
            // ゴール位置の「1番」「2番」と、参加者名を合わせて表示
            li.innerHTML = `<strong>${dot.finalRank}番:</strong> ${dot.name}`;
            resultList.appendChild(li);
        });
    }

    // ページロード時に初期化
    initialize();
});
