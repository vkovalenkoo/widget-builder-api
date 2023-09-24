#!/usr/bin/env node

import inquirer from 'inquirer';
import {
    getWidgetTemplateByName,
    getTemplateByNameFromList,
    getAllWidgetTemplates,
    updateWidgetTemplate,
    updateWidgetTemplateList,
  } from './api-methods.js';
  
  // Present the menu to the user
  function presentMenu() {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'menuChoice',
          message: 'Choose an option:',
          choices: [
            'Get all widget-templates',
            'Get a specific template by name',
            'Get a specific template by name (select from list)',
            'Update widget',
            'Update widget(select from list)',
            'Exit',
          ],
        },
      ])
      .then(async (answers) => {
        if (answers.menuChoice === 'Get all widget-templates') {
          await getAllWidgetTemplates();
        } else if (answers.menuChoice === 'Get a specif template by name') {
          inquirer
            .prompt([
              {
                type: 'input',
                name: 'templateName',
                message: 'Enter the name of the widget-template:',
              },
            ])
            .then(async (templateAnswers) => {
              await getWidgetTemplateByName(templateAnswers.templateName);
            });
        } else if (answers.menuChoice === 'Get a specif template by name (select from list)') {
          getTemplateByNameFromList();
        } else if (answers.menuChoice === 'Update widget') {
          inquirer
            .prompt([
              {
                type: 'input',
                name: 'widgetName',
                message: 'Enter the name of the widget-template to update:',
              },
            ])
            .then(async (updateAnswers) => {
              await updateWidgetTemplate(updateAnswers.widgetName);
            });
        } else if (answers.menuChoice === 'Update widget(select from list)') {
          updateWidgetTemplateList();
        }
      });
  }
  
  // Present the menu to the user
  presentMenu();