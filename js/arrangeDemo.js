
(function($) {
    var ctx = null;
    $(document).ready( function() {
        var surface = $('#surface')[0];
        ctx = surface.getContext('2d');
        var p = {};
        p.x = 70;
        p.y = 70;
        plot(p);
        
        p.x = 300;
        p.y = 270;
        plot(p);
    });

    var plot = function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();
    };

}(jQuery));
