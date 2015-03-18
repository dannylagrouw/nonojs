angular.module('nono', [])
  .controller('NonoController', ['$scope', function($scope) {

    var CellStatus = {
      EMPTY: 0,
      FILLED: 1,
      CROSSED: 2,
      BLANKED: 3
    };

    function Cell(row, col, solution, status) {
      this.row = row;
      this.col = col;
      this.solution = solution;
      this.status = status;

      this.isSolved = function() {
        return ((solution === CellStatus.FILLED) && (status === CellStatus.CROSSED)) ||
          ((solution === CellStatus.EMPTY) && ((status === CellStatus.BLANKED) || (status === CellStatus.EMPTY)));
      };
    }

    Cell.withDensity = function(row, col, density) {
      return new Cell(row, col, Math.random() < density ? CellStatus.FILLED : CellStatus.EMPTY, CellStatus.EMPTY);
    };

    function Strip(coord, cells) {
      this.coord = coord;
      this.cells = cells;

      this.getGroupSizesFor = function(predicate) {
        var sizes = [];
        var inGroup = false;
        var size = 0;
        cells.forEach(function(cell) {
          if (predicate(cell)) {
            if (inGroup) {
              size += 1;
            } else {
              inGroup = true;
              size = 1;
            }
          } else if (inGroup) {
            sizes.push(size);
            inGroup = false;
          }
        });
        if (inGroup) {
          sizes.push(size);
        }
        return sizes;
      };

      this.getGroupSizes = function() {
        return this.getGroupSizesFor(function(cell) {
          return cell.solution === CellStatus.FILLED;
        });
      };

      this.isSolved = function() {
        return !cells.some(function(cell) {
          return !cell.isSolved();
        });
      };
    }

    function Strips(strips) {
      this.strips = strips;

      this.getMaxGroupCount = function() {
        return strips.reduce(function(accumulated, strip) {
          var groupSizesSize = strip.getGroupSizes().length;
          if (groupSizesSize > accumulated) {
            return groupSizesSize;
          } else {
            return accumulated;
          }
        }, 0);
      };

      this.isSolved = function() {
        return !strips.some(function(strip) {
          return !strip.isSolved();
        });
      };

    }

    function Board(size) {
      var self = this;
      this.size = size;
      var DENSITY = 0.4;

      this.cells = (function() {
        var cells = new Array(size);
        for (var row = 0; row < size; row++) {
          cells[row] = new Array(size);
          for (var col = 0; col < size; col++) {
            cells[row][col] = Cell.withDensity(row, col, DENSITY);
          }
        }
        return cells;
      })();

      this.getRow = function(rowNum) {
        return new Strip(rowNum, (function() {
          var _cells = new Array(size);
          for (var col = 0; col < size; col++) {
            _cells[col] = self.cells[rowNum][col];
          }
          return _cells;
        })());
      };

      this.getColumn = function(colNum) {
        return new Strip(colNum, (function() {
          var _cells = new Array(size);
          for (var row = 0; row < size; row++) {
            _cells[row] = self.cells[row][colNum];
          }
          return _cells;
        })());
      };

      this.getRows = function() {
        return new Strips((function() {
          var strips = new Array(size);
          for (var row = 0; row < size; row++) {
            strips[row] = self.getRow(row);
          }
          return strips;
        })());
      };

      this.getColumns = function() {
        return new Strips((function() {
          var strips = new Array(size);
          for (var col = 0; col < size; col++) {
            strips[col] = self.getColumn(col);
          }
          return strips;
        })());
      };
    }

    function CanvasBoardRenderer(ctx) {
      var self = this;
      this.ctx = ctx;

      var CELL_SIZE = 30;
      var CELL_SPACING = 3;

      function CanvasCell(cell, indent, leading) {
        var self = this;
        this.cell = cell;
        this.indent = indent;
        this.leading = leading;

        this.draw = function() {
          ctx.strokeRect(cell.col * (CELL_SIZE + CELL_SPACING) + indent, cell.row * (CELL_SIZE + CELL_SPACING) + leading, CELL_SIZE, CELL_SIZE);
        };

        this.drawSolution = function() {
          ctx.strokeRect(cell.col * (CELL_SIZE + CELL_SPACING) + indent, cell.row * (CELL_SIZE + CELL_SPACING) + leading, CELL_SIZE, CELL_SIZE);
          if (cell.solution === CellStatus.FILLED) {
            ctx.fillRect(cell.col * (CELL_SIZE + CELL_SPACING) + indent, cell.row * (CELL_SIZE + CELL_SPACING) + leading, CELL_SIZE, CELL_SIZE);
          }
        };
      }

      this.renderSolution = function(board) {
        this.render(board, function(canvasCell) {
          canvasCell.drawSolution();
        })
      };

      this.renderPlay = function(board) {
        this.render(board, function(canvasCell) {
          canvasCell.draw();
        })
      };

      this.render = function(board, cellRenderer) {
        var ctx = self.ctx;
        //ctx.strokeRect(0, 0, 30, 30);
        //
        //ctx.strokeRect(30, 0, 30, 30);
        //
        //ctx.beginPath();
        //ctx.moveTo(30, 0);
        //ctx.lineTo(60, 30);
        //ctx.stroke();
        //ctx.closePath();
        //ctx.beginPath();
        //ctx.moveTo(60, 0);
        //ctx.lineTo(30, 30);
        //ctx.stroke();
        //ctx.closePath();
        //
        //ctx.strokeRect(60, 0, 30, 30);
        //ctx.fillRect(60, 0, 30, 30);

        ctx.font = "bold 16px Arial";

        var rows = board.getRows();
        var columns = board.getColumns();
        var maxRowGroups = rows.getMaxGroupCount();
        var maxColumnGroups = columns.getMaxGroupCount();
        var indent = 30 * (maxRowGroups + 1);
        var leading = 30 * (maxColumnGroups + 1);

        rows.strips.forEach(function(strip, stripIndex) {
          strip.getGroupSizes().forEach(function(size, sizeIndex) {
            ctx.fillText(size.toString(), sizeIndex * CELL_SIZE, (stripIndex + .5) * (CELL_SIZE + CELL_SPACING) + leading);
          })
        });

        columns.strips.forEach(function(strip, stripIndex) {
          strip.getGroupSizes().forEach(function(size, sizeIndex) {
            ctx.fillText(size.toString(), (stripIndex + .5) * (CELL_SIZE + CELL_SPACING) + indent, (sizeIndex + 1) * CELL_SIZE);
          })
        });

        [].concat.apply([], board.cells)
          .map(function(cell) {
            return new CanvasCell(cell, indent, leading);
          })
          .forEach(function(canvasCell) {
            cellRenderer(canvasCell);
          });
      };
    }

    $scope.init = function() {
      var canvas = document.getElementById('cnv');
      var ctx = canvas.getContext('2d');

      var board = new Board(10);
      console.log(board.cells);
      console.log(board.getColumns());
      console.log(board.getColumns().getMaxGroupCount());
      board.getColumns().strips.forEach(function(strip) {
        console.log('strip ' + strip.coord + ': ' + strip.getGroupSizes());
      });
      var renderer = new CanvasBoardRenderer(ctx);
      renderer.renderSolution(board);
    };

  }]);
