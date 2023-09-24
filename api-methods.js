import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import inquirer from 'inquirer';
import path from 'path';

let currentDirectory = process.cwd();

// run from project directory
if (currentDirectory.includes('widget-builder-api')) {
  currentDirectory = path.resolve('..', 'widget-workshop')
}

// run from theme directory
if (!currentDirectory.includes('tools-r-us')) {
  currentDirectory = path.resolve('tools-r-us', 'widget-workshop')
} else if (!currentDirectory.includes('widget-workshop')) {
  currentDirectory = path.resolve('widget-workshop')
}

dotenv.config({path: path.join(currentDirectory, '.env')});

let page = 1;
let totalPages = 1; // Initial value for total pages (to be updated from API response)

// Function to retrieve widget templates by name
async function getWidgetTemplateByName(name) {
  let widgetTemplate;

  try {

    while (page <= totalPages) {
      const data = await fetchPage(page);

      widgetTemplate = data.find((object) => object.name === name);

      if (widgetTemplate) {
        await processObject(widgetTemplate);
      }

      page++;
    }

    if (!widgetTemplate) {
      console.log(`Widget template '${name}' not found.`);
    }
  } catch (err) {
    console.error('Error: ' + err);
  }
}

// Function to retrieve a specif template by name (select from list)
async function getTemplateByNameFromList() {
  let templates = [];
  try {
      while (page <= totalPages) {
        const data = await fetchPage(page);
        
        for (const object of data) {
          templates.push(object);
        }
        page++;
      }

      inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'selectedTemplates',
          message: 'Select template names:',
          choices: templates.map((template) => ({
            name: template.name,
            value: template.name,
          })),
        },
      ])
      .then(async (answers) => {
        const selectedTemplateNames = answers.selectedTemplates;

        // Iterate through selected template names and retrieve each one
        for (const templateName of selectedTemplateNames) {
          await processObject(templates.find((template) => template.name === templateName))
        }
      });
  } catch (err) {
    console.error('Error: ' + err);
  }
}

// Function to retrieve all widget-templates
async function getAllWidgetTemplates() {
  try {
    while (page <= totalPages) {
      console.log(process.cwd())
      console.log(path.resolve(process.cwd(), '..', 'widget-workshop'))
      const data = await fetchPage(page);

      for (const object of data) {
        await processObject(object);
      }

      page++;
    }
    console.log('All widgets retrieved and saved.');
  } catch (err) {
    console.error('Error: ' + err);
  }
}


async function updateWidgetTemplate(name, uuid = null, schemaContent=null, widgetContent=null) {
  if (!uuid) {
    const uuidFilePath = path.join(currentDirectory, name, 'uuid.json');
    uuid = await getUuid(uuidFilePath);
    checkWidgetExistence(uuid);
    if (!uuid) {
      return;
    }
  }
    // Check if schemaContent and widgetContent are provided, otherwise fetch them
    if (!schemaContent || !widgetContent) {
      const folderPath = path.join(currentDirectory, name);
      const { schemaContent: newSchemaContent, widgetContent: newWidgetContent } = await checkWidgetAndSchemaFiles(folderPath);
  
      if (!schemaContent) {
        schemaContent = newSchemaContent;
      }
  
      if (!widgetContent) {
        widgetContent = newWidgetContent;
      }
    }
  
    if (!schemaContent || !widgetContent) {
      console.log(`Folder '${name}' does not have required files (schema.json and widget.html) and will be skipped.`);
      return;
    }
  
  inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'createNewVersion',
        message: `Create new widget version?`,
        default: true
      },
    ])
    .then(async (answers) => {
      const createNewVersion = answers.createNewVersion;

      const widgetUrl = `https://api.bigcommerce.com/stores/${process.env.WIDGET_BUILDER_API_HASH}/v3/content/widget-templates/${uuid}`;
      console.log(process.env.WIDGET_BUILDER_AUTH_TOKEN)
      const options = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': process.env.WIDGET_BUILDER_AUTH_TOKEN,
        },
        body: JSON.stringify({
          name: name,
          schema: JSON.parse(schemaContent),
          template: widgetContent,
          create_new_version: createNewVersion
        }),
      };

      const response = await fetch(widgetUrl, options);
      console.log(response)
      if (response.ok) {
        console.log(`Widget '${name}' updated successfully.`);
      } else {
        console.error(`Error updating widget '${name}': ${response.status} - ${response.statusText}`);
      }
    });
}

// Function to check widget-template directories and update/create widgets
async function updateWidgetTemplateList() {
  const widgetDirectory = await fs.readdir(currentDirectory); // Get a list of all folders in the current directory
  const validWidgetDirectory = [];

  for (const folderName of widgetDirectory) {
    const folderPath = path.join(currentDirectory, folderName);

    try {
      const stats = await fs.stat(folderPath);

      if (stats.isDirectory()) {
        // Check if the folder contains required files
        const schemaAndWidgetData = await checkWidgetAndSchemaFiles(folderPath);

        if (schemaAndWidgetData) {
          validWidgetDirectory.push({ name: folderName, data: schemaAndWidgetData });
        } else {
          console.log(`Folder '${folderName}' does not have required files (schema.json and widget.html) and will be skipped.`);
        }
      }
    } catch (error) {
      console.error(`Error checking folder '${folderName}': ${error.message}`);
    }
  }

  if (validWidgetDirectory.length === 0) {
    console.log('No valid widget-template directories found.');
    return;
  }

  inquirer
  .prompt([
    {
      type: 'checkbox',
      name: 'selectedFolders',
      message: 'Select widget-template folders to update:',
      choices: validWidgetDirectory.map((folder) => ({
        name: folder.name,
        value: {
          name: folder.name,
          schemaContent: folder.data.schemaContent,
          widgetContent: folder.data.widgetContent,
        },
      })),
    },
  ])
  .then(async (answers) => {
    const selectedFolders = answers.selectedFolders;

    // Iterate through selected folders and update each one
    for (const folderData of selectedFolders) {
      const { name, schemaContent, widgetContent } = folderData;
      await updateWidgetTemplate(name, null, schemaContent, widgetContent);
    }
  });
}

// Function to check if a widget with the same UUID exists on the storefront API
async function checkWidgetExistence(uuid) {
  const widgetUrl = `https://api.bigcommerce.com/stores/${process.env.WIDGET_BUILDER_API_HASH}/v3/storefront/widget-templates/${uuid}`;

  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': process.env.WIDGET_BUILDER_AUTH_TOKEN,
    },
  };

  const response = await fetch(widgetUrl, options);

  if (response.ok) {
    return true;
  } else if (response.status === 404) {
    return false;
  } else {
    throw new Error(`Error checking widget existence: ${response.status} - ${response.statusText}`);
  }
}


async function checkWidgetAndSchemaFiles(folderPath) {
  const schemaPath = path.join(folderPath, 'schema.json');
  const widgetPath = path.join(folderPath, 'widget.html');

  try {
    const [schemaStats, widgetStats] = await Promise.all([
      fs.stat(schemaPath),
      fs.stat(widgetPath),
    ]);

    if (schemaStats.isFile() && widgetStats.isFile()) {
      const [schemaContent, widgetContent] = await Promise.all([
        fs.readFile(schemaPath, 'utf8'),
        fs.readFile(widgetPath, 'utf8'),
      ]);

      return { schemaContent, widgetContent };
    }
  } catch (error) {
    // Ignore errors and return null if files are not found
  }

  return null;
}

async function getUuid(uuidFilePath) {
  try {
    const uuidData = await fs.readFile(uuidFilePath, 'utf-8');
    const parsedUuidData = JSON.parse(uuidData);
    return parsedUuidData.uuid;
  } catch (error) {
    console.error(`Error reading UUID from ${uuidFilePath}: ${error.message}`);
    return null;
  }
}

async function processObject(object) {
  // Create a folder with the name from the object's 'name' property
  const folderName = object.name;
  const folderNamePath = path.join(currentDirectory, folderName)
  if (!await folderExists(folderNamePath)) {
    // If it doesn't exist, create the folder
    await fs.mkdir(folderNamePath);
    console.log(`Folder '${folderName}' created successfully.`);
  } else {
    console.log(`Folder '${folderName}' already exists.`);
  }

  // Create a schema.json file with the value from the object's 'schema' property
  const schemaPath = `${folderNamePath}/schema.json`;
  await fs.writeFile(schemaPath, JSON.stringify(object.schema, null, 2), { flag: 'w' });

  // Create a widget.html file with the value from the object's 'template' property
  const widgetPath = `${folderNamePath}/widget.html`;
  await fs.writeFile(widgetPath, object.template, { flag: 'w' });

  // Create a uuid.json file with the value from the object's 'template' property
  const uuidPath = `${folderNamePath}/uuid.json`;
  await fs.writeFile(uuidPath, JSON.stringify({"uuid": object.uuid}, null, 2), { flag: 'w' });
}

// Function to check exsiting folder 
async function folderExists(folderNamePath) {
  try {
    await fs.access(folderNamePath);
    return true;
  } catch (error) {
    return false;
  }
}

// Function to fetch data from api
async function fetchPage(page) {
  let url = `https://api.bigcommerce.com/stores/${process.env.WIDGET_BUILDER_API_HASH}/v3/content/widget-templates?page=${page}`;
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': process.env.WIDGET_BUILDER_AUTH_TOKEN,
    },
  };

  const response = await fetch(url, options);

  if (response.ok) {
    const json = await response.json();
    totalPages = json.meta.pagination.total_pages; // Update the total pages from API response
    return json.data;
  } else {
    throw new Error(`Error fetching page ${page}: ${response.status} - ${response.statusText}`);
  }
}

export {
  getWidgetTemplateByName,
  getTemplateByNameFromList,
  getAllWidgetTemplates,
  updateWidgetTemplate,
  updateWidgetTemplateList,
};