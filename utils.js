function graph(ctx, arr, max, count, x, y, width, height, style, text) {
    if(text && arr.length > 0) {
        ctx.fillStyle = "Black";
        var current = parseFloat(arr[arr.length - 1].toFixed(3));
        ctx.fillText(text + ": " + current + " Max: " + parseFloat(max.toFixed(3)), x, y + 10);
    }

    ctx.strokeStyle = style;
    var px = 0;
    var step = width / count;
    var range = max/height;
    var startY = y + height;

    var i = Math.max(0, arr.length - count); //display the last (max) events
    ctx.moveTo(x, startY - arr[i]/height);
    ctx.beginPath();
    while(i < arr.length) {
        ctx.lineTo(x + px++ * step, startY - arr[i]/range);
        i++;
    }
    ctx.stroke();
}