# Widget Builder API

## Installation:
1. Prepare the environment for developing widget-templates.  [Follow these instructions](https://developer.bigcommerce.com/api-docs/store-management/widgets/widget-builder#continue-development-with-start)

2. Clone the repository into the "tools-r-us" folder.

3. Install dependencies.

4. Add variable WIDGET_BUILDER_API_HASH with store hash into the .env file.

## Executable:
#### To run from project directory:
```
npm run start
```
#### To run from theme directory by custom command:
1. Open ``package.json`` in root theme directory

2. Insert the following code into the ``package.json`` file:
```  
"bin": {
    "custom_name": "./tools-r-us/widget-builder-api/index.js"
  },
```

3. Run the command ```npm link```


***

#### Output:
``tools-r-us/widget-workshop/``

#### Stack:
* dotenv 16.3+
* inquirer 9.2
* node-fetch 3.3+


#### Developers:
Valentyn Kovalenko `valikko2004@gmail.com`