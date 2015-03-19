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

    Cell.withStatus = function(originalCell, newStatus) {
      return new Cell(originalCell.row, originalCell.col, originalCell.solution, newStatus);
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

    function Board(size, transformation) {
      var self = this;
      this.size = size;
      var DENSITY = 0.6;

      this.cells = (function() {
        var cells = new Array(size);
        for (var row = 0; row < size; row++) {
          cells[row] = new Array(size);
          for (var col = 0; col < size; col++) {
            if (transformation) {
              cells[row][col] = transformation.getCell(row, col);
            } else {
              cells[row][col] = Cell.withDensity(row, col, DENSITY);
            }
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

      this.isRowSolved = function(rowNum) {
        return this.getRows().strips[rowNum].isSolved();
      };

      this.isColumnSolved = function(colNum) {
        return this.getColumns().strips[colNum].isSolved();
      };

      this.isSolved = function() {
        return this.getRows().isSolved() && this.getColumns().isSolved();
      };

    }

    function MoveTransformation(board, cellStatus, row, col) {
      this.getCell = function(r, c) {
        //console.log('transformation[' + row + ',' + col + '].getCell(' + r + ',' + c + ')');
        if ((r === row) && (c === col)) {
          return Cell.withStatus(board.cells[r][c], cellStatus);
        } else {
          return board.cells[r][c];
        }
      };
    }

    function AutoFillSolvedTransformation(board) {
      this.getCell = function(row, col) {
        if (board.isRowSolved(row) && board.cells[row][col].status === CellStatus.EMPTY) {
          return Cell.withStatus(board.cells[row][col], CellStatus.BLANKED);
        } else if (board.isColumnSolved(col) && board.cells[row][col].status === CellStatus.EMPTY) {
          return Cell.withStatus(board.cells[row][col], CellStatus.BLANKED);
        } else {
          return board.cells[row][col];
        }
      };
    }

    function CanvasBoardRenderer(ctx) {
      var self = this;
      this.ctx = ctx;

      var CELL_SIZE = 30;
      var CELL_SPACING = 3;

      function CanvasCell(cell, indent, leading) {
        this.draw = function() {
          var x1 = cell.col * (CELL_SIZE + CELL_SPACING) + indent;
          var y1 = cell.row * (CELL_SIZE + CELL_SPACING) + leading;
          ctx.clearRect(x1, y1, CELL_SIZE, CELL_SIZE);
          ctx.strokeRect(x1, y1, CELL_SIZE, CELL_SIZE);
          if (cell.status === CellStatus.CROSSED) {
            ctx.fillRect(x1, y1, CELL_SIZE, CELL_SIZE);
          } else if (cell.status === CellStatus.BLANKED) {
            var x2 = x1 + CELL_SIZE;
            var y2 = y1 + CELL_SIZE;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.moveTo(x2, y1);
            ctx.lineTo(x1, y2);
            ctx.stroke();
            ctx.closePath();
          }
        };

        this.drawSolution = function() {
          var x = cell.col * (CELL_SIZE + CELL_SPACING) + indent;
          var y = cell.row * (CELL_SIZE + CELL_SPACING) + leading;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
          if (cell.solution === CellStatus.FILLED) {
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          }
        };
      }

      this.toCol = function(board, x) {
        var rows = board.getRows();
        var maxRowGroups = rows.getMaxGroupCount();
        var indent = CELL_SIZE * (maxRowGroups + 1);
        var col = Math.floor((x - indent) / (CELL_SIZE + CELL_SPACING));
        console.log('toCol ' + x + ' -> ' + col);
        return col;
      };

      this.toRow = function(board, y) {
        var columns = board.getColumns();
        var maxColumnGroups = columns.getMaxGroupCount();
        var leading = CELL_SIZE * (maxColumnGroups + 1);
        var row = Math.floor((y - leading) / (CELL_SIZE + CELL_SPACING));
        console.log('toRow ' + y + ' -> ' + row);
        return row;
      };

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

      this.renderGridLines = function(board, indent, leading) {
        ctx.strokeStyle = '#990099';
        for (var col = 5; col < board.size; col += 5) {
          var x = indent + (col * (CELL_SIZE + CELL_SPACING)) - (CELL_SPACING / 2);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, leading + (board.size * (CELL_SIZE + CELL_SPACING)) - CELL_SPACING);
          ctx.stroke();
          ctx.closePath();
        }
        for (var row = 5; row < board.size; row += 5) {
          var y = leading + (row * (CELL_SIZE + CELL_SPACING)) - (CELL_SPACING / 2);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(indent + (board.size * (CELL_SIZE + CELL_SPACING)) - CELL_SPACING, y);
          ctx.stroke();
          ctx.closePath();
        }
        ctx.strokeStyle = '#000000';
      };

      this.render = function(board, cellRenderer) {
        var ctx = self.ctx;
        ctx.font = "bold 16px Arial";

        var rows = board.getRows();
        var columns = board.getColumns();
        var maxRowGroups = rows.getMaxGroupCount();
        var maxColumnGroups = columns.getMaxGroupCount();
        var indent = CELL_SIZE * (maxRowGroups + 1);
        var leading = CELL_SIZE * (maxColumnGroups + 1);

        rows.strips.forEach(function(strip, stripIndex) {
          strip.getGroupSizes().forEach(function(size, sizeIndex, array) {
            ctx.fillText(size.toString(), indent - ((array.length - sizeIndex) * CELL_SIZE), (stripIndex + .7) * (CELL_SIZE + CELL_SPACING) + leading);
          })
        });

        columns.strips.forEach(function(strip, stripIndex) {
          strip.getGroupSizes().forEach(function(size, sizeIndex, array) {
            ctx.fillText(size.toString(), (stripIndex + .3) * (CELL_SIZE + CELL_SPACING) + indent, leading - ((array.length - sizeIndex - .5) * CELL_SIZE));
          })
        });

        [].concat.apply([], board.cells)
          .map(function(cell) {
            return new CanvasCell(cell, indent, leading);
          })
          .forEach(function(canvasCell) {
            cellRenderer(canvasCell);
          });

        this.renderGridLines(board, indent, leading);
      };
    }

    $scope.data = {
      board: undefined,
      renderer: undefined,
      autoFillSolved: true,
      solved: false,
      startTime: 0,
      time: ''
    };

    $scope.init = function() {
      $scope.data.solved = false;
      var canvas = document.getElementById('cnv');
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      $scope.data.board = new Board(20);
      console.log($scope.data.board.cells);
      console.log($scope.data.board.getColumns());
      console.log($scope.data.board.getColumns().getMaxGroupCount());
      $scope.data.board.getColumns().strips.forEach(function(strip) {
        console.log('strip ' + strip.coord + ': ' + strip.getGroupSizes());
      });
      $scope.data.renderer = new CanvasBoardRenderer(ctx);
      $scope.data.renderer.renderPlay($scope.data.board);
      $scope.data.startTime = new Date().getTime();
      var timer;
      timer = window.setInterval(function() {
        if ($scope.data.solved) {
          window.clearInterval(timer);
        } else {
          var sec = (new Date().getTime() - $scope.data.startTime) / 1000;
          var sec2 = Math.floor(sec % 60);
          $scope.data.time = Math.floor(sec / 60) + ':' + (sec2 < 10 ? '0' : '') + sec2;
          $scope.$apply();
        }
      }, 1000);
    };

    $scope.clicked = function(event) {
      console.log('click ' + event.offsetX + ', ' + event.offsetY);
      var col = $scope.data.renderer.toCol($scope.data.board, event.offsetX);
      var row = $scope.data.renderer.toRow($scope.data.board, event.offsetY);
      var status = (event.shiftKey ? CellStatus.BLANKED : (event.altKey ? CellStatus.EMPTY : CellStatus.CROSSED));
      $scope.data.board = new Board($scope.data.board.size, new MoveTransformation($scope.data.board, status, row, col));
      if ($scope.data.autoFillSolved) {
        $scope.data.board = new Board($scope.data.board.size, new AutoFillSolvedTransformation($scope.data.board));
      }
      $scope.data.renderer.renderPlay($scope.data.board);
      if ($scope.data.board.isSolved()) {
        $scope.data.solved = true;
      }
    };

  }]);
