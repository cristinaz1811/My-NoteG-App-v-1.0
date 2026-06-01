require('dotenv').config();
const db = require('./config/database');

const seedCourses = [
    {
        title: 'JavaScript Fundamentals',
        difficulty: 'beginner',
        description: 'Learn JavaScript through practical, browser-friendly programming tasks.',
        long_description: 'A modern, hands-on introduction to JavaScript that starts with the language essentials and gradually moves into control flow, functions, arrays, objects, and data transformation. Students finish the course with the confidence to read, write, and test real programs.',
        estimated_hours: 10,
        language: 'javascript',
        tags: ['javascript', 'web', 'beginner', 'frontend'],
        prerequisites: ['Basic computer literacy', 'No prior programming experience required'],
        learning_objectives: [
            'Understand core JavaScript syntax and data types',
            'Write functions with clear inputs and outputs',
            'Use arrays, objects, and JSON data structures',
            'Practice debugging and incremental problem solving',
            'Build small utilities that process real-world data'
        ],
        materials: [
            { title: 'MDN JavaScript Guide', resource_type: 'reference', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', description: 'Official reference for JavaScript language fundamentals.' },
            { title: 'JavaScript.info Essentials', resource_type: 'article', resource_url: 'https://javascript.info/', description: 'Clear, modern explanations of language concepts and patterns.' },
            { title: 'Array Methods Cheat Sheet', resource_type: 'cheatsheet', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array', description: 'Quick reference for mapping, filtering, reducing, and sorting arrays.' }
        ],
        chapters: [
            {
                title: 'Getting Started with JavaScript',
                description: 'Variables, values, operators, and the first building blocks of the language.',
                order_index: 1,
                materials: [
                    { title: 'JavaScript variable patterns', resource_type: 'cheatsheet', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types', description: 'A compact reference for identifiers, values, and types.' }
                ],
                exercises: [
                    {
                        title: 'Build a Greeting Formatter',
                        description: 'Write a function that accepts a full name and returns a polite greeting. Trim extra spaces, capitalize the first letter of each part, and return the result in a polished greeting string.',
                        difficulty: 'easy',
                        starter_code: 'function formatGreeting(name) {\n    // Normalize spacing and return a greeting string\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '"  ada lovelace  "', expected_output: '"Hello, Ada Lovelace!"', is_hidden: false },
                            { input: '"grace hopper"', expected_output: '"Hello, Grace Hopper!"', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Eligibility Checker',
                        description: 'Create a function that returns true when a learner is eligible for an advanced workshop. They must be at least 18 and have completed at least 3 exercises.',
                        difficulty: 'easy',
                        starter_code: 'function isEligible(age, completedExercises) {\n    // Return true or false\n}\n',
                        order_index: 2,
                        testCases: [
                            { input: '[18, 3]', expected_output: 'true', is_hidden: false },
                            { input: '[17, 10]', expected_output: 'false', is_hidden: false },
                            { input: '[24, 2]', expected_output: 'false', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Control Flow and Repetition',
                description: 'Conditionals, loops, and predictable decisions in code.',
                order_index: 2,
                materials: [
                    { title: 'Control flow quick reference', resource_type: 'reading', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling', description: 'A concise guide to if/else statements, loops, and branching.' }
                ],
                exercises: [
                    {
                        title: 'Cart Total Calculator',
                        description: 'Given an array of prices, return the total cost after applying a 10% student discount when the cart has 5 or more items.',
                        difficulty: 'medium',
                        starter_code: 'function calculateCartTotal(prices) {\n    // Sum prices and apply the discount rule\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[[10, 20, 30]]', expected_output: '60', is_hidden: false },
                            { input: '[[5, 5, 5, 5, 5]]', expected_output: '22.5', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Retry Budget',
                        description: 'Return the number of retries left after a failed submission sequence. The learner starts with 5 retries and loses one on every failed attempt, never dropping below zero.',
                        difficulty: 'easy',
                        starter_code: 'function retriesLeft(failedAttempts) {\n    // Clamp the value between 0 and 5\n}\n',
                        order_index: 2,
                        testCases: [
                            { input: '[0]', expected_output: '5', is_hidden: false },
                            { input: '[3]', expected_output: '2', is_hidden: false },
                            { input: '[9]', expected_output: '0', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Functions and Data Transformation',
                description: 'Reusable logic, higher-order thinking, and working with arrays.',
                order_index: 3,
                materials: [
                    { title: 'Function patterns in JavaScript', resource_type: 'article', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions', description: 'Different ways to define and use functions effectively.' }
                ],
                exercises: [
                    {
                        title: 'Summarize Cart Items',
                        description: 'Given an array of product objects, return the sum of all quantities and the total price rounded to two decimals.',
                        difficulty: 'medium',
                        starter_code: 'function summarizeCart(items) {\n    // Return an object with quantity and total\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[[{ quantity: 2, price: 5 }, { quantity: 1, price: 12 }]]', expected_output: '{ quantity: 3, total: 22 }', is_hidden: false },
                            { input: '[[{ quantity: 4, price: 2.5 }]]', expected_output: '{ quantity: 4, total: 10 }', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Average Study Score',
                        description: 'Return the average score from an array of scores, ignoring invalid values such as null or strings.',
                        difficulty: 'medium',
                        starter_code: 'function averageScore(scores) {\n    // Filter invalid entries and compute the average\n}\n',
                        order_index: 2,
                        testCases: [
                            { input: '[[10, 20, 30]]', expected_output: '20', is_hidden: false },
                            { input: '[[10, null, 20, "x", 30]]', expected_output: '20', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Objects, JSON, and Clean Data',
                description: 'Shape, validate, and normalize data for production-style exercises.',
                order_index: 4,
                materials: [
                    { title: 'JSON data handling reference', resource_type: 'reference', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON', description: 'Parsing and formatting structured data in JavaScript.' }
                ],
                exercises: [
                    {
                        title: 'Normalize Student Records',
                        description: 'Given an array of raw student records, return a new array with trimmed names, lowercase emails, and a generated fullName field.',
                        difficulty: 'medium',
                        starter_code: 'function normalizeStudents(records) {\n    // Return sanitized student objects\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[[{ name: "  Ada ", email: "ADA@EXAMPLE.COM" }]]', expected_output: '[{ name: "Ada", email: "ada@example.com", fullName: "Ada" }]', is_hidden: false },
                            { input: '[[{ name: " Grace Hopper ", email: "Grace@Example.com" }]]', expected_output: '[{ name: "Grace Hopper", email: "grace@example.com", fullName: "Grace Hopper" }]', is_hidden: true }
                        ]
                    }
                ]
            }
        ]
    },
    {
        title: 'Python Data Structures',
        difficulty: 'intermediate',
        description: 'Learn Python by solving practical data-processing and collection-manipulation tasks.',
        long_description: 'This course teaches Python through the lens of real data. Students practice lists, dictionaries, functions, and file-friendly workflows while building confidence with clean, readable Python code.',
        estimated_hours: 12,
        language: 'python',
        tags: ['python', 'automation', 'data', 'intermediate'],
        prerequisites: ['Basic computer literacy', 'Comfort typing and running code'],
        learning_objectives: [
            'Write Python functions with clear inputs and outputs',
            'Use lists, dictionaries, tuples, and sets effectively',
            'Transform and validate real-world data',
            'Practice clean code and test-driven thinking',
            'Solve problems using standard library tools'
        ],
        materials: [
            { title: 'Python data structures docs', resource_type: 'reference', resource_url: 'https://docs.python.org/3/tutorial/datastructures.html', description: 'Official Python guide to lists, dictionaries, sets, and tuples.' },
            { title: 'Real Python: Dictionaries', resource_type: 'article', resource_url: 'https://realpython.com/python-dicts/', description: 'Practical explanation of dictionary patterns and use cases.' },
            { title: 'File handling cheatsheet', resource_type: 'cheatsheet', resource_url: 'https://docs.python.org/3/tutorial/inputoutput.html#reading-and-writing-files', description: 'Quick reference for reading and writing files.' }
        ],
        chapters: [
            {
                title: 'Python Essentials',
                description: 'Syntax, types, variables, and the rhythm of writing Python code.',
                order_index: 1,
                materials: [
                    { title: 'Python built-in types', resource_type: 'reference', resource_url: 'https://docs.python.org/3/library/stdtypes.html', description: 'Quick lookup for strings, numbers, booleans, and collections.' }
                ],
                exercises: [
                    {
                        title: 'Score Cleaner',
                        description: 'Normalize a list of scores by clamping values to the 0-100 range and returning the cleaned list.',
                        difficulty: 'easy',
                        starter_code: 'def clean_scores(scores):\n    # Return a new list with every score clamped between 0 and 100\n    pass\n',
                        order_index: 1,
                        testCases: [
                            { input: '[[120, 90, -5, 75]]', expected_output: '[100, 90, 0, 75]', is_hidden: false },
                            { input: '[[50, 100, 101]]', expected_output: '[50, 100, 100]', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Running Total',
                        description: 'Build a prefix-sum list from a list of daily exercise completions.',
                        difficulty: 'easy',
                        starter_code: 'def running_total(numbers):\n    # Return cumulative totals\n    pass\n',
                        order_index: 2,
                        testCases: [
                            { input: '[[1, 2, 3, 4]]', expected_output: '[1, 3, 6, 10]', is_hidden: false },
                            { input: '[[5, 0, 5]]', expected_output: '[5, 5, 10]', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Lists and Dictionaries',
                description: 'Practical manipulation of the data structures used most often in Python.',
                order_index: 2,
                materials: [
                    { title: 'List operations cheat sheet', resource_type: 'cheatsheet', resource_url: 'https://docs.python.org/3/tutorial/datastructures.html#more-on-lists', description: 'Common list methods and slicing patterns.' }
                ],
                exercises: [
                    {
                        title: 'Word Frequency Counter',
                        description: 'Count how many times each word appears in a sentence, ignoring case and punctuation.',
                        difficulty: 'medium',
                        starter_code: 'def word_frequency(sentence):\n    # Return a dictionary of word counts\n    pass\n',
                        order_index: 1,
                        testCases: [
                            { input: '["Hello hello world!"]', expected_output: '{"hello": 2, "world": 1}', is_hidden: false },
                            { input: '["Code, code, and more code"]', expected_output: '{"code": 3, "and": 1, "more": 1}', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Unique Student IDs',
                        description: 'Return a sorted list of unique student IDs from a noisy input list.',
                        difficulty: 'easy',
                        starter_code: 'def unique_ids(values):\n    # Return sorted unique ids\n    pass\n',
                        order_index: 2,
                        testCases: [
                            { input: '[[101, 104, 101, 102]]', expected_output: '[101, 102, 104]', is_hidden: false },
                            { input: '[[7, 1, 7, 3, 1]]', expected_output: '[1, 3, 7]', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Functions and Modules',
                description: 'Encapsulate logic and write reusable utilities.',
                order_index: 3,
                materials: [
                    { title: 'Python functions guide', resource_type: 'article', resource_url: 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions', description: 'Function definitions, arguments, and return values.' }
                ],
                exercises: [
                    {
                        title: 'Temperature Converter',
                        description: 'Convert a temperature from Celsius to Fahrenheit and return a rounded integer.',
                        difficulty: 'easy',
                        starter_code: 'def celsius_to_fahrenheit(celsius):\n    pass\n',
                        order_index: 1,
                        testCases: [
                            { input: '[0]', expected_output: '32', is_hidden: false },
                            { input: '[25]', expected_output: '77', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Number Summarizer',
                        description: 'Return the minimum, maximum, and sum of a numeric list as a dictionary.',
                        difficulty: 'medium',
                        starter_code: 'def summarize_numbers(values):\n    # Return min, max, and sum\n    pass\n',
                        order_index: 2,
                        testCases: [
                            { input: '[[1, 4, 9]]', expected_output: '{"min": 1, "max": 9, "sum": 14}', is_hidden: false },
                            { input: '[[5, -2, 10]]', expected_output: '{"min": -2, "max": 10, "sum": 13}', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Working with Files and Collections',
                description: 'Build small utilities that look like the data-cleaning tasks used in real jobs.',
                order_index: 4,
                materials: [
                    { title: 'Reading files in Python', resource_type: 'reference', resource_url: 'https://docs.python.org/3/tutorial/inputoutput.html', description: 'Official file input and output guide.' }
                ],
                exercises: [
                    {
                        title: 'CSV Row Summarizer',
                        description: 'Given a list of CSV rows represented as dictionaries, return the number of valid rows and the average of a numeric field.',
                        difficulty: 'medium',
                        starter_code: 'def summarize_rows(rows):\n    # Return a report dictionary\n    pass\n',
                        order_index: 1,
                        testCases: [
                            { input: '[[{"score": 10}, {"score": 20}, {"score": 30}]]', expected_output: '{"valid_rows": 3, "average_score": 20}', is_hidden: false },
                            { input: '[[{"score": 12}, {"score": null}, {"score": 18}]]', expected_output: '{"valid_rows": 2, "average_score": 15}', is_hidden: true }
                        ]
                    }
                ]
            }
        ]
    },
    {
        title: 'Algorithms and Problem Solving',
        difficulty: 'advanced',
        description: 'Practice algorithmic thinking, complexity analysis, and interview-style problem solving.',
        long_description: 'This course focuses on the thinking patterns behind efficient algorithms. Students build intuition for arrays, stacks, recursion, graphs, hashing, and dynamic programming through carefully sequenced exercises.',
        estimated_hours: 18,
        language: 'javascript',
        tags: ['algorithms', 'data-structures', 'interviews', 'complexity'],
        prerequisites: ['Comfort writing functions', 'Basic understanding of arrays and loops'],
        learning_objectives: [
            'Analyze time and space complexity',
            'Choose the right data structure for a problem',
            'Recognize common algorithmic patterns',
            'Solve interview-style problems confidently',
            'Write cleaner, more efficient solutions'
        ],
        materials: [
            { title: 'Big-O Cheat Sheet', resource_type: 'cheatsheet', resource_url: 'https://www.bigocheatsheet.com/', description: 'Quick lookup for algorithmic complexity.' },
            { title: 'VisuAlgo', resource_type: 'video', resource_url: 'https://visualgo.net/en', description: 'Interactive visualizations for classic data structures and algorithms.' },
            { title: 'CP-Algorithms Reference', resource_type: 'reference', resource_url: 'https://cp-algorithms.com/', description: 'A deeper reference for core algorithmic techniques.' }
        ],
        chapters: [
            {
                title: 'Complexity and Arrays',
                description: 'Start with the mental model of efficiency and the most common linear patterns.',
                order_index: 1,
                materials: [
                    { title: 'Complexity primer', resource_type: 'cheatsheet', resource_url: 'https://www.bigocheatsheet.com/', description: 'A fast visual guide to big-O notation.' }
                ],
                exercises: [
                    {
                        title: 'Maximum Subarray Sum',
                        description: 'Return the largest sum of any contiguous subarray using an efficient linear-time approach.',
                        difficulty: 'medium',
                        starter_code: 'function maxSubarray(nums) {\n    // Implement Kadane\'s algorithm\n}\n',
                        order_index: 1,
                        requires_efficiency: true,
                        testCases: [
                            { input: '[[ -2,1,-3,4,-1,2,1,-5,4 ]]', expected_output: '6', is_hidden: false },
                            { input: '[[1]]', expected_output: '1', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Stacks and Queues',
                description: 'Use LIFO and FIFO structures to solve validation and scheduling problems.',
                order_index: 2,
                materials: [
                    { title: 'Stack & queue patterns', resource_type: 'article', resource_url: 'https://cp-algorithms.com/data_structures/stack_queue_modification.html', description: 'Common stack and queue-based problem patterns.' }
                ],
                exercises: [
                    {
                        title: 'Balanced Brackets',
                        description: 'Return true when a string of parentheses, brackets, and braces is balanced.',
                        difficulty: 'medium',
                        starter_code: 'function isBalanced(s) {\n    // Use a stack to validate the string\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '["()[]{}"]', expected_output: 'true', is_hidden: false },
                            { input: '["([)]"]', expected_output: 'false', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Trees and Recursion',
                description: 'Use recursion to explore hierarchical data structures.',
                order_index: 3,
                materials: [
                    { title: 'Tree traversals visual guide', resource_type: 'video', resource_url: 'https://visualgo.net/en/bst', description: 'A visual introduction to tree traversal strategies.' }
                ],
                exercises: [
                    {
                        title: 'Binary Tree Depth',
                        description: 'Given a binary tree represented as nested objects, return its maximum depth.',
                        difficulty: 'medium',
                        starter_code: 'function maxDepth(root) {\n    // Return the maximum depth of the tree\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[{"val":1,"left":null,"right":null}]', expected_output: '1', is_hidden: false },
                            { input: '[{"val":1,"left":{"val":2,"left":null,"right":null},"right":{"val":3,"left":null,"right":null}}]', expected_output: '2', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Hashing and Dynamic Programming',
                description: 'Recognize repeated subproblems and constant-time lookup opportunities.',
                order_index: 4,
                materials: [
                    { title: 'Hash table fundamentals', resource_type: 'reference', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map', description: 'Reference for efficient key-value lookups in JavaScript.' }
                ],
                exercises: [
                    {
                        title: 'Two Sum Variations',
                        description: 'Return the indices of two numbers that add up to the target using a hash map.',
                        difficulty: 'easy',
                        starter_code: 'function twoSum(nums, target) {\n    // Return the matching indices\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[[2,7,11,15], 9]', expected_output: '[0,1]', is_hidden: false },
                            { input: '[[3,2,4], 6]', expected_output: '[1,2]', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Memoized Fibonacci',
                        description: 'Return the nth Fibonacci number using memoization or dynamic programming.',
                        difficulty: 'medium',
                        starter_code: 'function fib(n, memo = {}) {\n    // Cache intermediate results\n}\n',
                        order_index: 2,
                        requires_efficiency: true,
                        time_limit_minutes: 5,
                        testCases: [
                            { input: '[6]', expected_output: '8', is_hidden: false },
                            { input: '[10]', expected_output: '55', is_hidden: true }
                        ]
                    }
                ]
            }
        ]
    },
    {
        title: 'TypeScript Essentials',
        difficulty: 'intermediate',
        description: 'Add type safety to your JavaScript code and build more maintainable applications.',
        long_description: 'TypeScript extends JavaScript with static types, making it easier to catch bugs early and write self-documenting code. This course covers type annotations, interfaces, generics, and practical patterns used in professional TypeScript projects.',
        estimated_hours: 14,
        language: 'typescript',
        tags: ['typescript', 'javascript', 'types', 'intermediate'],
        prerequisites: ['Solid JavaScript fundamentals', 'Understanding of functions and objects'],
        learning_objectives: [
            'Annotate variables, parameters, and return types',
            'Use interfaces and type aliases to model data',
            'Write reusable code with generics',
            'Narrow types with guards and discriminated unions',
            'Migrate real JavaScript utilities to TypeScript'
        ],
        materials: [
            { title: 'TypeScript Official Handbook', resource_type: 'reference', resource_url: 'https://www.typescriptlang.org/docs/handbook/intro.html', description: 'The authoritative guide to TypeScript language features.' },
            { title: 'TypeScript Playground', resource_type: 'reference', resource_url: 'https://www.typescriptlang.org/play', description: 'Experiment with TypeScript code directly in the browser.' },
            { title: 'Total TypeScript — Beginner', resource_type: 'article', resource_url: 'https://www.totaltypescript.com/tutorials/beginners-typescript', description: 'Practical exercises for TypeScript beginners.' }
        ],
        chapters: [
            {
                title: 'Types and Annotations',
                description: 'Primitive types, union types, and how to annotate your functions.',
                order_index: 1,
                materials: [
                    { title: 'Everyday Types reference', resource_type: 'reference', resource_url: 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html', description: 'Quick lookup for basic TypeScript types.' }
                ],
                exercises: [
                    {
                        title: 'Typed Greeting Builder',
                        description: 'Add TypeScript annotations to a greeting function. The function takes a name (string) and an optional title (string | undefined) and returns a formatted greeting string.',
                        difficulty: 'easy',
                        starter_code: 'function buildGreeting(name: string, title?: string): string {\n    // Return "Hello, Dr. Ada!" when title is provided, "Hello, Ada!" otherwise\n    return "";\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '["Ada", "Dr."]', expected_output: '"Hello, Dr. Ada!"', is_hidden: false },
                            { input: '["Grace"]', expected_output: '"Hello, Grace!"', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Union Type Validator',
                        description: 'Write a function that accepts a value typed as string | number | boolean and returns its type as a lowercase string: "string", "number", or "boolean".',
                        difficulty: 'easy',
                        starter_code: 'function getTypeName(value: string | number | boolean): string {\n    // Return the type name as a string\n    return "";\n}\n',
                        order_index: 2,
                        testCases: [
                            { input: '[42]', expected_output: '"number"', is_hidden: false },
                            { input: '["hello"]', expected_output: '"string"', is_hidden: false },
                            { input: '[true]', expected_output: '"boolean"', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Interfaces and Type Aliases',
                description: 'Model structured data with interfaces and create reusable type definitions.',
                order_index: 2,
                materials: [
                    { title: 'Object types and interfaces', resource_type: 'article', resource_url: 'https://www.typescriptlang.org/docs/handbook/2/objects.html', description: 'How to describe object shapes in TypeScript.' }
                ],
                exercises: [
                    {
                        title: 'User Profile Formatter',
                        description: 'Given a User interface with id (number), name (string), and email (string), write a function that returns a formatted display string: "#1 — Ada (ada@example.com)".',
                        difficulty: 'easy',
                        starter_code: 'interface User {\n    id: number;\n    name: string;\n    email: string;\n}\n\nfunction formatUser(user: User): string {\n    // Format as "#id — name (email)"\n    return "";\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[{ "id": 1, "name": "Ada", "email": "ada@example.com" }]', expected_output: '"#1 — Ada (ada@example.com)"', is_hidden: false },
                            { input: '[{ "id": 7, "name": "Grace", "email": "grace@example.com" }]', expected_output: '"#7 — Grace (grace@example.com)"', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Product Inventory Summary',
                        description: 'Given an array of Product objects (name: string, price: number, inStock: boolean), return an object with totalProducts, inStockCount, and averagePrice (rounded to 2 decimals).',
                        difficulty: 'medium',
                        starter_code: 'interface Product {\n    name: string;\n    price: number;\n    inStock: boolean;\n}\n\ninterface Summary {\n    totalProducts: number;\n    inStockCount: number;\n    averagePrice: number;\n}\n\nfunction summarizeInventory(products: Product[]): Summary {\n    // Return the summary object\n    return { totalProducts: 0, inStockCount: 0, averagePrice: 0 };\n}\n',
                        order_index: 2,
                        testCases: [
                            { input: '[[{ "name": "Book", "price": 10, "inStock": true }, { "name": "Pen", "price": 2, "inStock": false }]]', expected_output: '{ "totalProducts": 2, "inStockCount": 1, "averagePrice": 6 }', is_hidden: false },
                            { input: '[[{ "name": "Laptop", "price": 999, "inStock": true }, { "name": "Mouse", "price": 25, "inStock": true }]]', expected_output: '{ "totalProducts": 2, "inStockCount": 2, "averagePrice": 512 }', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Generics',
                description: 'Write flexible, reusable utility functions with generic type parameters.',
                order_index: 3,
                materials: [
                    { title: 'Generics in TypeScript', resource_type: 'article', resource_url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html', description: 'How generics enable reusable typed utilities.' }
                ],
                exercises: [
                    {
                        title: 'Generic First and Last',
                        description: 'Write a generic function firstAndLast<T>(arr: T[]) that returns an object with first and last properties. Return null for both when the array is empty.',
                        difficulty: 'medium',
                        starter_code: 'function firstAndLast<T>(arr: T[]): { first: T | null; last: T | null } {\n    // Return first and last elements\n    return { first: null, last: null };\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[[1, 2, 3]]', expected_output: '{ "first": 1, "last": 3 }', is_hidden: false },
                            { input: '[["a", "b"]]', expected_output: '{ "first": "a", "last": "b" }', is_hidden: false },
                            { input: '[[]]', expected_output: '{ "first": null, "last": null }', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Generic Filter By Key',
                        description: 'Write a generic function filterByKey<T, K extends keyof T>(items: T[], key: K, value: T[K]) that returns items matching the given key-value pair.',
                        difficulty: 'medium',
                        starter_code: 'function filterByKey<T, K extends keyof T>(items: T[], key: K, value: T[K]): T[] {\n    // Return items where item[key] === value\n    return [];\n}\n',
                        order_index: 2,
                        testCases: [
                            { input: '[[{ "role": "admin", "name": "A" }, { "role": "user", "name": "B" }], "role", "admin"]', expected_output: '[{ "role": "admin", "name": "A" }]', is_hidden: false },
                            { input: '[[{ "active": true }, { "active": false }, { "active": true }], "active", true]', expected_output: '[{ "active": true }, { "active": true }]', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Type Guards and Narrowing',
                description: 'Use type guards and discriminated unions to write safe, precise TypeScript.',
                order_index: 4,
                materials: [
                    { title: 'Narrowing in TypeScript', resource_type: 'reference', resource_url: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html', description: 'How TypeScript narrows types with control flow.' }
                ],
                exercises: [
                    {
                        title: 'Result Type Handler',
                        description: 'Implement a handler for a Result<T> discriminated union with shapes { ok: true, value: T } | { ok: false, error: string }. Return the value when ok, or throw an Error with the error message.',
                        difficulty: 'medium',
                        starter_code: 'type Result<T> = { ok: true; value: T } | { ok: false; error: string };\n\nfunction unwrap<T>(result: Result<T>): T {\n    // Return value or throw error\n    throw new Error("not implemented");\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[{ "ok": true, "value": 42 }]', expected_output: '42', is_hidden: false },
                            { input: '[{ "ok": true, "value": "hello" }]', expected_output: '"hello"', is_hidden: true }
                        ]
                    }
                ]
            }
        ]
    },
    {
        title: 'Web APIs and the DOM',
        difficulty: 'beginner',
        description: 'Learn how browsers work and how to interact with web pages using JavaScript.',
        long_description: 'This course bridges the gap between vanilla JavaScript and real browser environments. Students learn how to query and manipulate the DOM, handle events, fetch data from APIs, and understand how modern web pages are built and updated.',
        estimated_hours: 8,
        language: 'javascript',
        tags: ['javascript', 'web', 'dom', 'apis', 'beginner'],
        prerequisites: ['Basic JavaScript syntax', 'Understanding of functions and arrays'],
        learning_objectives: [
            'Select and manipulate DOM elements',
            'Handle user events with addEventListener',
            'Fetch and display data from public APIs',
            'Understand the event loop and asynchronous JavaScript',
            'Work with Promises and async/await'
        ],
        materials: [
            { title: 'MDN DOM Guide', resource_type: 'reference', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction', description: 'The official introduction to the Document Object Model.' },
            { title: 'MDN Fetch API', resource_type: 'reference', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch', description: 'How to use the Fetch API to request data from servers.' },
            { title: 'JavaScript.info: Async/Await', resource_type: 'article', resource_url: 'https://javascript.info/async-await', description: 'Clear explanation of async/await with practical examples.' }
        ],
        chapters: [
            {
                title: 'Understanding the DOM',
                description: 'The DOM tree, querying elements, and reading their properties.',
                order_index: 1,
                materials: [
                    { title: 'DOM tree visual guide', resource_type: 'article', resource_url: 'https://javascript.info/dom-nodes', description: 'How the browser builds its internal tree from HTML.' }
                ],
                exercises: [
                    {
                        title: 'CSS Selector Matcher',
                        description: 'Write a function that, given an array of CSS class strings and a target class, returns all strings that include the target class.',
                        difficulty: 'easy',
                        starter_code: 'function findByClass(classLists, targetClass) {\n    // Return class strings that include targetClass\n    return [];\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[["btn active", "card", "btn"], "btn"]', expected_output: '["btn active", "btn"]', is_hidden: false },
                            { input: '[["nav-link active", "nav-link", "footer"], "active"]', expected_output: '["nav-link active"]', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Attribute Parser',
                        description: 'Parse a simple HTML attribute string like \'id="main" class="hero" data-value="42"\' into a key-value object.',
                        difficulty: 'medium',
                        starter_code: 'function parseAttributes(attrString) {\n    // Return an object of attribute name -> value pairs\n    return {};\n}\n',
                        order_index: 2,
                        testCases: [
                            { input: '["id=\\"main\\" class=\\"hero\\""]', expected_output: '{ "id": "main", "class": "hero" }', is_hidden: false },
                            { input: '["data-count=\\"5\\" disabled=\\"true\\""]', expected_output: '{ "data-count": "5", "disabled": "true" }', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Events and Callbacks',
                description: 'How event listeners work, event bubbling, and callback patterns.',
                order_index: 2,
                materials: [
                    { title: 'MDN Event reference', resource_type: 'reference', resource_url: 'https://developer.mozilla.org/en-US/docs/Web/Events', description: 'Complete index of browser events and their properties.' }
                ],
                exercises: [
                    {
                        title: 'Event Queue Simulator',
                        description: 'Implement a simple event emitter: addListener(event, fn), emit(event, data) — calls all listeners for that event with data. Return all collected outputs.',
                        difficulty: 'medium',
                        starter_code: 'function createEmitter() {\n    const listeners = {};\n    return {\n        addListener(event, fn) {\n            // Store the listener\n        },\n        emit(event, data) {\n            // Call listeners for this event\n        }\n    };\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '["click", 42]', expected_output: '[42]', is_hidden: false },
                            { input: '["resize", "large"]', expected_output: '["large"]', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Promises and Async/Await',
                description: 'Asynchronous JavaScript patterns for handling data fetching and timing.',
                order_index: 3,
                materials: [
                    { title: 'Promises in depth', resource_type: 'article', resource_url: 'https://javascript.info/promise-basics', description: 'A thorough introduction to the Promise API.' }
                ],
                exercises: [
                    {
                        title: 'Promise Chainer',
                        description: 'Given an array of numbers, return a Promise that resolves to the array with each number doubled, after a simulated delay. Use Promise.resolve() and .then() chaining.',
                        difficulty: 'easy',
                        starter_code: 'function doubleAll(numbers) {\n    // Return a promise that resolves to numbers doubled\n    return Promise.resolve([]);\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[[1, 2, 3]]', expected_output: '[2, 4, 6]', is_hidden: false },
                            { input: '[[5, 10]]', expected_output: '[10, 20]', is_hidden: true }
                        ]
                    },
                    {
                        title: 'Async Data Transformer',
                        description: 'Write an async function that takes an array of user objects and returns a new array with only name and id fields, sorted by id ascending.',
                        difficulty: 'medium',
                        starter_code: 'async function transformUsers(users) {\n    // Return a promise resolving to filtered, sorted users\n    return [];\n}\n',
                        order_index: 2,
                        testCases: [
                            { input: '[[{ "id": 3, "name": "Charlie", "email": "c@c.com" }, { "id": 1, "name": "Alice", "email": "a@a.com" }]]', expected_output: '[{ "id": 1, "name": "Alice" }, { "id": 3, "name": "Charlie" }]', is_hidden: false },
                            { input: '[[{ "id": 2, "name": "Bob", "email": "b@b.com" }]]', expected_output: '[{ "id": 2, "name": "Bob" }]', is_hidden: true }
                        ]
                    }
                ]
            },
            {
                title: 'Working with JSON APIs',
                description: 'Parse, transform, and validate data returned from REST APIs.',
                order_index: 4,
                materials: [
                    { title: 'Working with JSON guide', resource_type: 'reference', resource_url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/JSON', description: 'How to parse and serialize JSON data in JavaScript.' }
                ],
                exercises: [
                    {
                        title: 'API Response Normalizer',
                        description: 'Normalize an API response object by extracting data.items (array), adding a total count, and returning { items, total }. Handle missing fields gracefully.',
                        difficulty: 'medium',
                        starter_code: 'function normalizeApiResponse(response) {\n    // Return { items: [...], total: N } safely\n    return { items: [], total: 0 };\n}\n',
                        order_index: 1,
                        testCases: [
                            { input: '[{ "data": { "items": [1, 2, 3] } }]', expected_output: '{ "items": [1, 2, 3], "total": 3 }', is_hidden: false },
                            { input: '[{ "data": {} }]', expected_output: '{ "items": [], "total": 0 }', is_hidden: true }
                        ]
                    }
                ]
            }
        ]
    }
];


async function getSeedAuthorId() {
    const result = await db.query(
        `SELECT id FROM users WHERE role IN ('admin', 'professor') ORDER BY id LIMIT 1`
    );

    if (result.rows.length > 0) {
        return result.rows[0].id;
    }

    const fallback = await db.query(
        `INSERT INTO users (username, email, password_hash, role, email_verified)
         VALUES ('admin', 'admin@noteg.local', '', 'admin', TRUE)
         RETURNING id`
    );

    return fallback.rows[0].id;
}

async function upsertCourse(authorId, course) {
    const existing = await db.query('SELECT id FROM courses WHERE title = $1 LIMIT 1', [course.title]);

    if (existing.rows.length > 0) {
        await db.query(
            `UPDATE courses
             SET description = $2,
                 difficulty = $3,
                 long_description = $4,
                 estimated_hours = $5,
                 language = $6,
                 tags = $7,
                 prerequisites = $8,
                 learning_objectives = $9,
                 is_private = FALSE,
                 enrollment_code = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [
                existing.rows[0].id,
                course.description,
                course.difficulty,
                course.long_description,
                course.estimated_hours,
                course.language,
                course.tags,
                course.prerequisites,
                course.learning_objectives,
            ]
        );
        return existing.rows[0].id;
    }

    const created = await db.query(
        `INSERT INTO courses (
            title, description, difficulty, created_by, long_description,
            estimated_hours, tags, prerequisites, learning_objectives, language,
            is_private, enrollment_code
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,NULL)
         RETURNING id`,
        [
            course.title,
            course.description,
            course.difficulty,
            authorId,
            course.long_description,
            course.estimated_hours,
            course.tags,
            course.prerequisites,
            course.learning_objectives,
            course.language,
        ]
    );

    return created.rows[0].id;
}

async function upsertChapter(courseId, chapter) {
    const existing = await db.query(
        'SELECT id FROM chapters WHERE course_id = $1 AND title = $2 LIMIT 1',
        [courseId, chapter.title]
    );

    if (existing.rows.length > 0) {
        await db.query(
            `UPDATE chapters
             SET description = $3,
                 order_index = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [existing.rows[0].id, chapter.title, chapter.description, chapter.order_index]
        );
        return existing.rows[0].id;
    }

    const created = await db.query(
        `INSERT INTO chapters (course_id, title, description, order_index)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [courseId, chapter.title, chapter.description, chapter.order_index]
    );

    return created.rows[0].id;
}

async function upsertExercise(courseId, chapterId, exercise) {
    const existing = await db.query(
        'SELECT id FROM exercises WHERE course_id = $1 AND title = $2 LIMIT 1',
        [courseId, exercise.title]
    );

    const params = [
        exercise.description,
        exercise.difficulty,
        exercise.starter_code,
        exercise.language || 'javascript',
        chapterId,
        exercise.order_index,
        !!exercise.requires_efficiency,
        exercise.time_limit_minutes || null,
        !!exercise.is_multi_file,
    ];

    let exerciseId;
    if (existing.rows.length > 0) {
        exerciseId = existing.rows[0].id;
        await db.query(
            `UPDATE exercises
             SET description = $2,
                 difficulty = $3,
                 starter_code = $4,
                 language = $5,
                 chapter_id = $6,
                 order_index = $7,
                 requires_efficiency = $8,
                 time_limit_minutes = $9,
                 is_multi_file = $10,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [exerciseId, ...params]
        );
        await db.query('DELETE FROM test_cases WHERE exercise_id = $1', [exerciseId]);
    } else {
        const created = await db.query(
            `INSERT INTO exercises (
                course_id, chapter_id, title, description, difficulty, starter_code,
                language, order_index, requires_efficiency, time_limit_minutes, is_multi_file
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING id`,
            [
                courseId,
                chapterId,
                exercise.title,
                exercise.description,
                exercise.difficulty,
                exercise.starter_code,
                exercise.language || 'javascript',
                exercise.order_index,
                !!exercise.requires_efficiency,
                exercise.time_limit_minutes || null,
                !!exercise.is_multi_file,
            ]
        );
        exerciseId = created.rows[0].id;
    }

    for (const [index, testCase] of exercise.testCases.entries()) {
        await db.query(
            `INSERT INTO test_cases (exercise_id, input, expected_output, is_hidden, weight)
             VALUES ($1, $2, $3, $4, $5)`,
            [exerciseId, testCase.input, testCase.expected_output, !!testCase.is_hidden, index + 1]
        );
    }
}

async function seed() {
    const authorId = await getSeedAuthorId();

    for (const course of seedCourses) {
        const courseId = await upsertCourse(authorId, course);

        for (const chapter of course.chapters) {
            const chapterId = await upsertChapter(courseId, chapter);

            for (const exercise of chapter.exercises) {
                await upsertExercise(courseId, chapterId, exercise);
            }
        }
    }

    console.log('Seeded real course content successfully.');
}

seed()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        try {
            await db.pool.end();
        } catch {
            // ignore
        }
    });
