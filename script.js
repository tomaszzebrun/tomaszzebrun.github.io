$(document).ready(function() {

   const apiRoot = 'http://localhost:8080/crud/v1/task/';
   const trelloApiRoot = 'http://localhost:8080/crud/v1/trello/';
   const datatableRowTemplate = $('[data-datatable-row-template]').children()[0];
   const $tasksContainer = $('[data-tasks-container]');

   var availableBoards = {};
   var availableTasks = {};

   // init
   getAllTasks();

   function getAllAvailableBoards(callback, callbackArgs) {
      var requestUrl = trelloApiRoot + 'getTrelloBoards';
//      alert("Ajax: getAllAvailableBoards: " + requestUrl);
      $.ajax({
         url: requestUrl,
         method: 'GET',
         contentType: 'application/json',
         success: function(boards) { callback(callbackArgs, boards); }
     });
   }

   function createElement(data) {
//      alert("Start: createElement");
      const element = $(datatableRowTemplate).clone();

      element.attr('data-task-id', data.id);
      element.find('[data-task-name-section] [data-task-name-paragraph]').text(data.title);
      element.find('[data-task-name-section] [data-task-name-input]').val(data.title);

      element.find('[data-task-content-section] [data-task-content-paragraph]').text(data.content);
      element.find('[data-task-content-section] [data-task-content-input]').val(data.content);

      return element;
   }

   function prepareBoardOrListSelectOptions(availableChoices) {
//      alert("Start: prepareBoardOrListSelectOptions");
      return availableChoices.map(function(choice) {
         return $('<option>')
            .addClass('crud-select__option')
            .val(choice.id)
            .text(choice.name || 'Unknown name');
     });
   }

   function handleDatatableRender(taskData, boards) {
//      alert("Start: handleDatatableRender");
      $tasksContainer.empty();
      boards.forEach(board => {
         availableBoards[board.id] = board;
      });

     taskData.forEach(function(task) {
        var $datatableRowEl = createElement(task);
        var $availableBoardsOptionElements = prepareBoardOrListSelectOptions(boards);

        $datatableRowEl.find('[data-board-name-select]')
           .append($availableBoardsOptionElements);

        $datatableRowEl
          .appendTo($tasksContainer);
     });
   }

   function getAllTasks() {
      const requestUrl = apiRoot + 'getTasks';
//      alert("Ajax: getAllTasks: " + requestUrl);
      $.ajax({
         url: requestUrl,
         method: 'GET',
         contentType: "application/json",
         success: function(tasks) {
            tasks.forEach(task => {
               availableTasks[task.id] = task;
            });

         getAllAvailableBoards(handleDatatableRender, tasks);
         }
      });
   }

   function handleTaskUpdateRequest() {
      var parentEl = $(this).parents('[data-task-id]');
      var taskId = parentEl.attr('data-task-id');
      var taskTitle = parentEl.find('[data-task-name-input]').val();
      var taskContent = parentEl.find('[data-task-content-input]').val();
      var requestUrl = apiRoot + 'updateTask';
//      alert("Ajax: handleTaskUpdateRequest: " + requestUrl);
      $.ajax({
         url: requestUrl,
         method: "PUT",
         processData: false,
         contentType: "application/json; charset=utf-8",
         dataType: 'json',
         data: JSON.stringify({
           id: taskId,
           title: taskTitle,
           content: taskContent
         }),
         success: function(data) {
            parentEl.attr('data-task-id', data.id).toggleClass('datatable__row--editing');
            parentEl.find('[data-task-name-paragraph]').text(taskTitle);
            parentEl.find('[data-task-content-paragraph]').text(taskContent);
         }
      });
   }

   function handleTaskDeleteRequest() {
      var parentEl = $(this).parents('[data-task-id]');
      var taskId = parentEl.attr('data-task-id');
      var requestUrl = apiRoot + 'deleteTask';
//      alert("Ajax: handleTaskDeleteRequest: " + requestUrl);
      $.ajax({
         url: requestUrl + '/?' + $.param({
            taskId: taskId
         }),
         method: 'DELETE',
         success: function() {
            parentEl.slideUp(400, function() { parentEl.remove(); });
         }
      })
   }

   function handleTaskSubmitRequest(event) {
//      alert("Start: handleTaskSubmitRequest");
      event.preventDefault();

      var taskTitle = $(this).find('[name="title"]').val();
      var taskContent = $(this).find('[name="content"]').val();

      var requestUrl = apiRoot + 'createTask';
//      alert("Ajax: handleTaskSubmitRequest: " + requestUrl);
      $.ajax({
         url: requestUrl,
         method: 'POST',
         processData: false,
         contentType: "application/json; charset=utf-8",
         dataType: 'json',
         data: JSON.stringify({
            title: taskTitle,
            content: taskContent
         }),
        complete: function(data) {
           if (data.status === 200) {
              getAllTasks();
           }
        }
      });
   }

   function toggleEditingState() {
//      alert("Start: toggleEditingState");
      var parentEl = $(this).parents('[data-task-id]');
      parentEl.toggleClass('datatable__row--editing');

      var taskTitle = parentEl.find('[data-task-name-paragraph]').text();
      var taskContent = parentEl.find('[data-task-content-paragraph]').text();

      parentEl.find('[data-task-name-input]').val(taskTitle);
      parentEl.find('[data-task-content-input]').val(taskContent);
   }

   function handleBoardNameSelect(event) {
//       alert("Start: handleBoardNameSelect");
      var $changedSelectEl = $(event.target);
      var selectedBoardId = $changedSelectEl.val();
      var $listNameSelectEl = $changedSelectEl.siblings('[data-list-name-select]');
      var preparedListOptions = prepareBoardOrListSelectOptions(availableBoards[selectedBoardId].lists);

      $listNameSelectEl.empty().append(preparedListOptions);
   }

   function handleCardCreationRequest(event) {
      var requestUrl = trelloApiRoot + 'createTrelloCard';
      var $relatedTaskRow = $(event.target).parents('[data-task-id]');
      var relatedTaskId = $relatedTaskRow.attr('data-task-id');
      var relatedTask = availableTasks[relatedTaskId];
      var selectedListId = $relatedTaskRow.find('[data-list-name-select]').val();

      if (!selectedListId) {
         alert('You have to select a board and a list first!');
         return;
      }
//      alert("Ajax: handleCardCreationRequest: " + requestUrl);
      $.ajax({
         url: requestUrl,
         method: 'POST',
         processData: false,
         contentType: "application/json; charset=utf-8",
         dataType: 'json',
         data: JSON.stringify({
         name: relatedTask.title,
            description: relatedTask.content,
            listId: selectedListId
         }),
         success: function(data) {
            console.log('Card created - ' + data.shortUrl);
            alert('Card created - ' + data.shortUrl);
         }
       });
   }

   $('[data-task-add-form]').on('submit', handleTaskSubmitRequest);

   $tasksContainer.on('change','[data-board-name-select]', handleBoardNameSelect);
   $tasksContainer.on('click','[data-trello-card-creation-trigger]', handleCardCreationRequest);
   $tasksContainer.on('click','[data-task-edit-button]', toggleEditingState);
   $tasksContainer.on('click','[data-task-edit-abort-button]', toggleEditingState);
   $tasksContainer.on('click','[data-task-submit-update-button]', handleTaskUpdateRequest);
   $tasksContainer.on('click','[data-task-delete-button]', handleTaskDeleteRequest);
});