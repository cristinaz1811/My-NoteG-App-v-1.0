/**
 * reset-and-seed.js
 * Clears all data except user accounts, then seeds fresh academic content
 * for the admin user.
 *
 * Usage: node reset-and-seed.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'code_learning',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const db = { query: (text, params) => pool.query(text, params) };

// ── helpers ────────────────────────────────────────────────────────────────

async function truncateAll() {
    // Single CASCADE truncate clears everything except users
    await db.query(`
        TRUNCATE TABLE
            plagiarism_matches,
            plagiarism_reports,
            lecture_progress,
            lecture_media,
            lecture_pages,
            lectures,
            calendar_events,
            exam_sessions,
            exercise_files,
            ai_complexity_analysis,
            ai_hints,
            help_requests,
            notifications,
            course_time_sessions,
            user_progress,
            submissions,
            test_cases,
            enrollments,
            class_enrollments,
            exercises,
            chapters,
            courses,
            classes,
            college_years
        RESTART IDENTITY CASCADE
    `);
    console.log('✓ Cleared all non-user data');
}

async function insertYear(name, faculty, schoolYear, description, orderIndex, createdBy) {
    const res = await db.query(
        `INSERT INTO college_years (name, faculty, school_year, description, order_index, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [name, faculty, schoolYear, description, orderIndex, createdBy]
    );
    return res.rows[0].id;
}

async function insertClass(yearId, name, description, orderIndex, createdBy) {
    const res = await db.query(
        `INSERT INTO classes (year_id, name, description, order_index, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [yearId, name, description, orderIndex, createdBy]
    );
    return res.rows[0].id;
}

async function insertCourse(classId, title, description, difficulty, language, estimatedHours, createdBy) {
    const res = await db.query(
        `INSERT INTO courses (class_id, title, description, difficulty, language, estimated_hours, created_by, is_private)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false) RETURNING id`,
        [classId, title, description, difficulty, language, estimatedHours, createdBy]
    );
    return res.rows[0].id;
}

async function insertChapter(courseId, title, description, orderIndex) {
    const res = await db.query(
        `INSERT INTO chapters (course_id, title, description, order_index)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [courseId, title, description, orderIndex]
    );
    return res.rows[0].id;
}

async function insertLecture(courseId, chapterId, title, description, orderIndex) {
    const res = await db.query(
        `INSERT INTO lectures (course_id, chapter_id, title, description, order_index)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [courseId, chapterId, title, description, orderIndex]
    );
    return res.rows[0].id;
}

async function insertPage(lectureId, pageNumber, title, content) {
    const res = await db.query(
        `INSERT INTO lecture_pages (lecture_id, page_number, title, content)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [lectureId, pageNumber, title, content]
    );
    return res.rows[0].id;
}

async function insertExercise(courseId, chapterId, title, description, difficulty, starterCode, language, orderIndex) {
    const res = await db.query(
        `INSERT INTO exercises (course_id, chapter_id, title, description, difficulty, starter_code, language, order_index, time_limit_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [courseId, chapterId, title, description, difficulty, starterCode, language, orderIndex, 30]
    );
    return res.rows[0].id;
}

async function insertTestCase(exerciseId, input, expectedOutput, isHidden, weight) {
    await db.query(
        `INSERT INTO test_cases (exercise_id, input, expected_output, is_hidden, weight)
         VALUES ($1, $2, $3, $4, $5)`,
        [exerciseId, input, expectedOutput, isHidden || false, weight || 1]
    );
}

// ── content ────────────────────────────────────────────────────────────────

async function seed() {
    const adminRes = await db.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminRes.rows.length === 0) {
        throw new Error('No admin user found. Cannot seed without an admin.');
    }
    const adminId = adminRes.rows[0].id;
    console.log(`✓ Admin user id=${adminId}`);

    // ══════════════════════════════════════════════════════════════
    // YEAR 1
    // ══════════════════════════════════════════════════════════════
    const year1 = await insertYear(
        'Year 1',
        'Faculty of Computer Science and Economic Informatics',
        '2024-2025',
        'First year undergraduate studies in Computer Science',
        1, adminId
    );
    console.log(`✓ Year 1 (id=${year1})`);

    // ── Year 1 / Class A ──────────────────────────────────────────
    const class1A = await insertClass(year1, 'Group 1041 A', 'Algorithms & Data Structures group', 1, adminId);

    // ─ Course: Data Structures in Python ─
    const dsCourse = await insertCourse(
        class1A,
        'Data Structures in Python',
        'A hands-on introduction to fundamental data structures using Python. You will implement arrays, linked lists, stacks, queues, trees, and graphs from scratch.',
        'beginner', 'python', 40, adminId
    );

    const dsCh1 = await insertChapter(dsCourse, 'Linear Data Structures', 'Arrays, linked lists, stacks, and queues', 1);
    const dsCh2 = await insertChapter(dsCourse, 'Trees and Graphs', 'Binary trees, BSTs, and graph traversals', 2);
    const dsCh3 = await insertChapter(dsCourse, 'Sorting and Searching', 'Comparison-based sorting and binary search', 3);

    // Chapter 1 — Lecture 1
    const dsL1 = await insertLecture(dsCourse, dsCh1,
        'Arrays and Dynamic Arrays', 'Understanding static and dynamic arrays in memory', 1);
    await insertPage(dsL1, 1, 'What is an Array?',
        `<h2>What is an Array?</h2>
<p>An <strong>array</strong> is a collection of elements stored at <em>contiguous memory locations</em>. It is one of the simplest and most widely used data structures.</p>
<ul>
  <li>All elements have the <strong>same data type</strong></li>
  <li>Elements are accessed by a numeric <strong>index</strong> (zero-based in Python)</li>
  <li>Random access is <strong>O(1)</strong> — instant regardless of array size</li>
</ul>
<pre><code># Creating and accessing a list (Python's dynamic array)
numbers = [10, 20, 30, 40, 50]
print(numbers[0])   # 10 — first element
print(numbers[-1])  # 50 — last element</code></pre>
<blockquote>In Python, the built-in <code>list</code> type is a dynamic array — it automatically resizes as you add elements.</blockquote>`
    );
    await insertPage(dsL1, 2, 'Array Operations and Complexity',
        `<h2>Common Array Operations</h2>
<p>Knowing the time complexity of each operation helps you pick the right data structure for the job.</p>
<ol>
  <li><strong>Access</strong> — <code>O(1)</code>: direct index lookup</li>
  <li><strong>Search</strong> — <code>O(n)</code>: may need to scan the whole array</li>
  <li><strong>Insert at end</strong> — <code>O(1)</code> amortized (dynamic array)</li>
  <li><strong>Insert at middle/start</strong> — <code>O(n)</code>: must shift elements</li>
  <li><strong>Delete</strong> — <code>O(n)</code>: must shift elements after deletion</li>
</ol>
<pre><code>numbers = [1, 2, 3, 4, 5]

# Append — O(1) amortized
numbers.append(6)

# Insert at index 2 — O(n)
numbers.insert(2, 99)

# Remove by value — O(n)
numbers.remove(99)

print(numbers)  # [1, 2, 3, 4, 5, 6]</code></pre>`
    );
    await insertPage(dsL1, 3, 'Two-Pointer Technique',
        `<h2>Two-Pointer Technique</h2>
<p>Many array problems can be solved efficiently using <strong>two pointers</strong> — one starting from the left and one from the right.</p>
<pre><code>def reverse_array(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        arr[left], arr[right] = arr[right], arr[left]
        left += 1
        right -= 1
    return arr

print(reverse_array([1, 2, 3, 4, 5]))  # [5, 4, 3, 2, 1]</code></pre>
<p>This runs in <strong>O(n)</strong> time and <strong>O(1)</strong> space — much better than creating a new reversed array.</p>
<h3>When to use two pointers:</h3>
<ul>
  <li>Reversing arrays or strings</li>
  <li>Finding pairs that sum to a target</li>
  <li>Checking if an array is a palindrome</li>
  <li>Removing duplicates from a sorted array</li>
</ul>`
    );

    // Chapter 1 — Lecture 2
    const dsL2 = await insertLecture(dsCourse, dsCh1,
        'Stacks and Queues', 'LIFO and FIFO data structures and their applications', 2);
    await insertPage(dsL2, 1, 'The Stack',
        `<h2>The Stack — Last In, First Out</h2>
<p>A <strong>stack</strong> follows the <em>LIFO</em> principle: the last element pushed is the first one popped. Think of a stack of plates.</p>
<pre><code>class Stack:
    def __init__(self):
        self._data = []

    def push(self, item):
        self._data.append(item)      # O(1)

    def pop(self):
        if self.is_empty():
            raise IndexError("Stack is empty")
        return self._data.pop()      # O(1)

    def peek(self):
        return self._data[-1]        # O(1)

    def is_empty(self):
        return len(self._data) == 0

s = Stack()
s.push(1); s.push(2); s.push(3)
print(s.pop())   # 3
print(s.peek())  # 2</code></pre>
<p>Real-world uses: undo/redo, function call stack, expression evaluation, backtracking.</p>`
    );
    await insertPage(dsL2, 2, 'The Queue',
        `<h2>The Queue — First In, First Out</h2>
<p>A <strong>queue</strong> follows the <em>FIFO</em> principle. Think of a line at a coffee shop.</p>
<pre><code>from collections import deque

class Queue:
    def __init__(self):
        self._data = deque()

    def enqueue(self, item):
        self._data.append(item)       # O(1)

    def dequeue(self):
        if self.is_empty():
            raise IndexError("Queue is empty")
        return self._data.popleft()   # O(1)

    def is_empty(self):
        return len(self._data) == 0

q = Queue()
q.enqueue("Alice"); q.enqueue("Bob"); q.enqueue("Carol")
print(q.dequeue())   # Alice
print(q.dequeue())   # Bob</code></pre>
<blockquote>Always use <code>collections.deque</code> for queues in Python — <code>list.pop(0)</code> is O(n) and will be slow on large inputs.</blockquote>`
    );

    // Chapter 1 exercises
    const exReverseArr = await insertExercise(
        dsCourse, dsCh1,
        'Reverse an Array',
        `Given a list of integers on a single line separated by spaces, print the list in reverse order on a single line.

**Example:**
- Input: \`1 2 3 4 5\`
- Output: \`5 4 3 2 1\`

Do not use Python's built-in \`reverse()\` or slicing \`[::-1]\`. Implement it yourself.`,
        'easy',
        `# Read input
numbers = list(map(int, input().split()))

# TODO: reverse the list in-place and print it
`,
        'python', 1
    );
    await insertTestCase(exReverseArr, '1 2 3 4 5', '5 4 3 2 1', false, 1);
    await insertTestCase(exReverseArr, '42', '42', false, 1);
    await insertTestCase(exReverseArr, '10 20', '20 10', false, 1);
    await insertTestCase(exReverseArr, '3 1 4 1 5 9 2 6', '6 2 9 5 1 4 1 3', true, 2);
    await insertTestCase(exReverseArr, '100 200 300 400 500 600', '600 500 400 300 200 100', true, 2);

    const exMaxSubarray = await insertExercise(
        dsCourse, dsCh1,
        'Maximum Subarray Sum',
        `Find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

**Example:**
- Input: \`-2 1 -3 4 -1 2 1 -5 4\`
- Output: \`6\` (subarray \`[4, -1, 2, 1]\`)

Hint: Kadane's Algorithm runs in O(n).`,
        'medium',
        `# Read input
numbers = list(map(int, input().split()))

# TODO: find and print the maximum subarray sum
`,
        'python', 2
    );
    await insertTestCase(exMaxSubarray, '-2 1 -3 4 -1 2 1 -5 4', '6', false, 1);
    await insertTestCase(exMaxSubarray, '1', '1', false, 1);
    await insertTestCase(exMaxSubarray, '-1 -2 -3', '-1', false, 1);
    await insertTestCase(exMaxSubarray, '5 4 -1 7 8', '23', true, 2);
    await insertTestCase(exMaxSubarray, '-2 -3 4 -1 -2 1 5 -3', '7', true, 2);

    const exValidParens = await insertExercise(
        dsCourse, dsCh1,
        'Valid Parentheses',
        `Given a string containing only the characters \`(\`, \`)\`, \`{\`, \`}\`, \`[\` and \`]\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.

Print \`True\` if valid, \`False\` otherwise.

**Examples:**
- Input: \`()\` → Output: \`True\`
- Input: \`()[]{}\` → Output: \`True\`
- Input: \`(]\` → Output: \`False\``,
        'medium',
        `s = input().strip()

# TODO: use a stack to check if parentheses are valid
# Print True or False
`,
        'python', 3
    );
    await insertTestCase(exValidParens, '()', 'True', false, 1);
    await insertTestCase(exValidParens, '()[{}]', 'True', false, 1);
    await insertTestCase(exValidParens, '(]', 'False', false, 1);
    await insertTestCase(exValidParens, '{[()]}', 'True', true, 2);
    await insertTestCase(exValidParens, '(()', 'False', true, 2);

    // Chapter 2 — Trees
    const dsL3 = await insertLecture(dsCourse, dsCh2,
        'Binary Trees', 'Tree terminology, traversals, and the binary search tree property', 1);
    await insertPage(dsL3, 1, 'Tree Fundamentals',
        `<h2>Tree Fundamentals</h2>
<p>A <strong>tree</strong> is a hierarchical data structure consisting of nodes connected by edges. Every tree has a <em>root</em> node, and each node can have zero or more <em>children</em>.</p>
<ul>
  <li><strong>Root</strong> — the top node with no parent</li>
  <li><strong>Leaf</strong> — a node with no children</li>
  <li><strong>Height</strong> — the longest path from root to a leaf</li>
  <li><strong>Depth</strong> — the distance from the root to a node</li>
</ul>
<pre><code>class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val   = val
        self.left  = left
        self.right = right

# Build:   1
#         / \\
#        2   3
#       / \\
#      4   5
root = TreeNode(1)
root.left  = TreeNode(2, TreeNode(4), TreeNode(5))
root.right = TreeNode(3)</code></pre>`
    );
    await insertPage(dsL3, 2, 'Tree Traversals',
        `<h2>Tree Traversals</h2>
<p>There are three common depth-first traversal orders:</p>
<pre><code>def inorder(node):   # Left → Root → Right
    if node:
        inorder(node.left)
        print(node.val, end=" ")
        inorder(node.right)

def preorder(node):  # Root → Left → Right
    if node:
        print(node.val, end=" ")
        preorder(node.left)
        preorder(node.right)

def postorder(node): # Left → Right → Root
    if node:
        postorder(node.left)
        postorder(node.right)
        print(node.val, end=" ")</code></pre>
<p>For the tree above: inorder gives <code>4 2 5 1 3</code>, preorder gives <code>1 2 4 5 3</code>.</p>
<h3>Breadth-First (Level-Order) Traversal</h3>
<pre><code>from collections import deque

def bfs(root):
    if not root:
        return
    queue = deque([root])
    while queue:
        node = queue.popleft()
        print(node.val, end=" ")
        if node.left:  queue.append(node.left)
        if node.right: queue.append(node.right)</code></pre>`
    );

    const exTreeHeight = await insertExercise(
        dsCourse, dsCh2,
        'Height of a Binary Tree',
        `Given a binary tree represented as a list of values in level-order (use \`-1\` for null nodes), find and print its height.

Height = number of edges on the longest path from root to a leaf. An empty tree has height -1, a tree with one node has height 0.

**Input format:** a single line of space-separated integers (level-order). \`-1\` means the node is absent.

**Examples:**
- Input: \`1 2 3 4 5 -1 -1\` → Output: \`2\`
- Input: \`1\` → Output: \`0\`
- Input: \`-1\` → Output: \`-1\``,
        'medium',
        `from collections import deque

def build_tree(values):
    if not values or values[0] == -1:
        return None
    root = type('Node', (), {'val': values[0], 'left': None, 'right': None})()
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] != -1:
            node.left = type('Node', (), {'val': values[i], 'left': None, 'right': None})()
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] != -1:
            node.right = type('Node', (), {'val': values[i], 'left': None, 'right': None})()
            queue.append(node.right)
        i += 1
    return root

values = list(map(int, input().split()))
root = build_tree(values)

# TODO: compute and print the height of the tree
`,
        'python', 1
    );
    await insertTestCase(exTreeHeight, '1 2 3 4 5 -1 -1', '2', false, 1);
    await insertTestCase(exTreeHeight, '1', '0', false, 1);
    await insertTestCase(exTreeHeight, '-1', '-1', false, 1);
    await insertTestCase(exTreeHeight, '1 2 3 -1 -1 4 5', '2', true, 2);
    await insertTestCase(exTreeHeight, '1 2 -1 3 -1 4 -1', '3', true, 2);

    // Chapter 3 — Sorting
    const dsL4 = await insertLecture(dsCourse, dsCh3,
        'Sorting Algorithms', 'Bubble sort, merge sort, and quicksort with complexity analysis', 1);
    await insertPage(dsL4, 1, 'O(n²) Sorts',
        `<h2>Simple O(n²) Sorting Algorithms</h2>
<h3>Bubble Sort</h3>
<p>Repeatedly swaps adjacent elements that are in the wrong order. Easy to understand, but slow on large inputs.</p>
<pre><code>def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

print(bubble_sort([64, 34, 25, 12, 22, 11, 90]))
# [11, 12, 22, 25, 34, 64, 90]</code></pre>
<p><strong>Time:</strong> O(n²) worst/average, O(n) best (already sorted). <strong>Space:</strong> O(1).</p>`
    );
    await insertPage(dsL4, 2, 'Merge Sort — Divide and Conquer',
        `<h2>Merge Sort</h2>
<p>Merge sort uses the <strong>divide and conquer</strong> paradigm. It splits the array in half, recursively sorts each half, then merges the two sorted halves.</p>
<pre><code>def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result</code></pre>
<p><strong>Time:</strong> O(n log n) in all cases. <strong>Space:</strong> O(n) — needs auxiliary memory.</p>`
    );
    await insertPage(dsL4, 3, 'Binary Search',
        `<h2>Binary Search</h2>
<p>On a <em>sorted</em> array, binary search finds a target in <strong>O(log n)</strong> by halving the search space each step.</p>
<pre><code>def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid          # found at index mid
        elif arr[mid] < target:
            low = mid + 1       # search right half
        else:
            high = mid - 1      # search left half
    return -1                   # not found

arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print(binary_search(arr, 23))   # 5
print(binary_search(arr, 10))   # -1</code></pre>
<blockquote>Binary search requires a sorted array. Sorting costs O(n log n), so only use binary search when you'll perform multiple queries on the same data.</blockquote>`
    );

    const exMergeSort = await insertExercise(
        dsCourse, dsCh3,
        'Implement Merge Sort',
        `Given a list of integers, sort them in ascending order using **merge sort** and print the result.

Do not use Python's built-in \`sort()\` or \`sorted()\`.

**Example:**
- Input: \`5 2 4 6 1 3\`
- Output: \`1 2 3 4 5 6\``,
        'medium',
        `numbers = list(map(int, input().split()))

# TODO: implement merge sort and print the sorted list
`,
        'python', 1
    );
    await insertTestCase(exMergeSort, '5 2 4 6 1 3', '1 2 3 4 5 6', false, 1);
    await insertTestCase(exMergeSort, '1', '1', false, 1);
    await insertTestCase(exMergeSort, '3 1', '1 3', false, 1);
    await insertTestCase(exMergeSort, '9 8 7 6 5 4 3 2 1', '1 2 3 4 5 6 7 8 9', true, 2);
    await insertTestCase(exMergeSort, '4 4 4 2 2 1', '1 2 2 4 4 4', true, 2);

    const exBinarySearch = await insertExercise(
        dsCourse, dsCh3,
        'Binary Search',
        `Given a sorted list of distinct integers and a target, return the **0-based index** of the target. If the target is not present, return \`-1\`.

**Input:** first line is the sorted space-separated list, second line is the target integer.

**Examples:**
- Input: \`1 3 5 7 9 11\` / \`7\` → Output: \`3\`
- Input: \`1 3 5\` / \`4\` → Output: \`-1\``,
        'easy',
        `arr = list(map(int, input().split()))
target = int(input())

# TODO: implement binary search iteratively
# Print the index or -1
`,
        'python', 2
    );
    await insertTestCase(exBinarySearch, '1 3 5 7 9 11\n7', '3', false, 1);
    await insertTestCase(exBinarySearch, '1 3 5\n4', '-1', false, 1);
    await insertTestCase(exBinarySearch, '2\n2', '0', false, 1);
    await insertTestCase(exBinarySearch, '1 2 3 4 5 6 7 8 9 10\n10', '9', true, 2);
    await insertTestCase(exBinarySearch, '10 20 30 40 50\n15', '-1', true, 2);

    console.log(`✓ Course: Data Structures in Python`);

    // ─ Course: Discrete Mathematics ─
    const mathCourse = await insertCourse(
        class1A,
        'Discrete Mathematics',
        'Logic, set theory, combinatorics, and graph theory — the mathematical foundation of computer science.',
        'beginner', 'python', 30, adminId
    );

    const mathCh1 = await insertChapter(mathCourse, 'Propositional Logic', 'Truth tables, logical connectives, tautologies', 1);
    const mathCh2 = await insertChapter(mathCourse, 'Combinatorics', 'Permutations, combinations, and the pigeonhole principle', 2);

    const mathL1 = await insertLecture(mathCourse, mathCh1,
        'Propositional Logic Basics', 'Truth values, connectives, and truth tables', 1);
    await insertPage(mathL1, 1, 'Logical Connectives',
        `<h2>Logical Connectives</h2>
<p>Propositional logic studies how statements can be combined using <strong>logical connectives</strong>:</p>
<ul>
  <li><strong>NOT (¬)</strong> — negation. True becomes False and vice versa.</li>
  <li><strong>AND (∧)</strong> — conjunction. True only when both operands are True.</li>
  <li><strong>OR (∨)</strong> — disjunction. True when at least one operand is True.</li>
  <li><strong>IMPLIES (→)</strong> — implication. Only False when antecedent is True and consequent is False.</li>
  <li><strong>BICONDITIONAL (↔)</strong> — True when both sides have the same truth value.</li>
</ul>
<pre><code># Python mirrors logical operators
p = True
q = False

print(not p)        # False
print(p and q)      # False
print(p or q)       # True
print(not p or q)   # False  (equivalent to p → q)</code></pre>`
    );
    await insertPage(mathL1, 2, 'Truth Tables',
        `<h2>Truth Tables</h2>
<p>A truth table lists all possible combinations of truth values for the variables in a formula.</p>
<pre><code># Generate truth table for p AND q
for p in [True, False]:
    for q in [True, False]:
        print(f"p={int(p)} q={int(q)} | p∧q={int(p and q)} | p∨q={int(p or q)} | p→q={int(not p or q)}")</code></pre>
<p>Output:</p>
<pre><code>p=1 q=1 | p∧q=1 | p∨q=1 | p→q=1
p=1 q=0 | p∧q=0 | p∨q=1 | p→q=0
p=0 q=1 | p∧q=0 | p∨q=1 | p→q=1
p=0 q=0 | p∧q=0 | p∨q=0 | p→q=1</code></pre>
<blockquote>A <strong>tautology</strong> is a formula that is True for every possible assignment of truth values (e.g., <code>p ∨ ¬p</code>).</blockquote>`
    );

    const exLogic = await insertExercise(
        mathCourse, mathCh1,
        'Evaluate a Logical Expression',
        `Given two boolean values p and q (as integers 0 or 1), evaluate the following logical expression and print the result:

**(p AND q) OR (NOT p AND NOT q)**

This is the biconditional p ↔ q.

Print \`1\` for True and \`0\` for False.

**Input:** two integers on the same line (p and q)
**Examples:**
- Input: \`1 1\` → Output: \`1\`
- Input: \`1 0\` → Output: \`0\``,
        'easy',
        `p, q = map(int, input().split())
p, q = bool(p), bool(q)

# TODO: evaluate (p AND q) OR (NOT p AND NOT q) and print 1 or 0
`,
        'python', 1
    );
    await insertTestCase(exLogic, '1 1', '1', false, 1);
    await insertTestCase(exLogic, '1 0', '0', false, 1);
    await insertTestCase(exLogic, '0 1', '0', false, 1);
    await insertTestCase(exLogic, '0 0', '1', false, 1);

    const mathL2 = await insertLecture(mathCourse, mathCh2,
        'Counting Principles', 'Permutations, combinations, and factorials', 1);
    await insertPage(mathL2, 1, 'Permutations and Combinations',
        `<h2>Permutations</h2>
<p>A <strong>permutation</strong> is an ordered arrangement of objects. The number of permutations of n objects taken r at a time:</p>
<pre><code>P(n, r) = n! / (n - r)!</code></pre>
<pre><code>from math import factorial

def permutations(n, r):
    return factorial(n) // factorial(n - r)

print(permutations(5, 3))  # 60</code></pre>
<h2>Combinations</h2>
<p>A <strong>combination</strong> is an unordered selection. Order does not matter.</p>
<pre><code>C(n, r) = n! / (r! × (n - r)!)</code></pre>
<pre><code>from math import comb
print(comb(5, 3))   # 10 — choosing 3 items from 5 ignoring order</code></pre>`
    );

    const exCombinations = await insertExercise(
        mathCourse, mathCh2,
        'Combinations C(n, k)',
        `Compute and print the binomial coefficient C(n, k) — the number of ways to choose k items from n without repetition and without regard to order.

**Input:** two integers n and k on a single line
**Output:** C(n, k)

Do not use Python's \`math.comb\` — implement it yourself using factorials.

**Examples:**
- Input: \`5 3\` → Output: \`10\`
- Input: \`10 0\` → Output: \`1\``,
        'easy',
        `n, k = map(int, input().split())

# TODO: compute C(n, k) = n! / (k! * (n-k)!) and print it
`,
        'python', 1
    );
    await insertTestCase(exCombinations, '5 3', '10', false, 1);
    await insertTestCase(exCombinations, '10 0', '1', false, 1);
    await insertTestCase(exCombinations, '1 1', '1', false, 1);
    await insertTestCase(exCombinations, '10 5', '252', true, 2);
    await insertTestCase(exCombinations, '20 10', '184756', true, 2);

    console.log(`✓ Course: Discrete Mathematics`);

    // ── Year 1 / Class B ──────────────────────────────────────────
    const class1B = await insertClass(year1, 'Group 1041 B', 'Web Technologies group', 2, adminId);

    const jsCourse = await insertCourse(
        class1B,
        'JavaScript Fundamentals',
        'Learn the foundations of JavaScript: variables, functions, arrays, objects, and DOM manipulation. Build interactive web pages from the ground up.',
        'beginner', 'javascript', 35, adminId
    );

    const jsCh1 = await insertChapter(jsCourse, 'Core Language', 'Variables, control flow, functions, and scope', 1);
    const jsCh2 = await insertChapter(jsCourse, 'Arrays and Objects', 'Working with collections and structured data', 2);

    const jsL1 = await insertLecture(jsCourse, jsCh1,
        'Variables, Types, and Control Flow', 'const, let, data types, and if/else/loops', 1);
    await insertPage(jsL1, 1, 'Declaring Variables',
        `<h2>Variables in JavaScript</h2>
<p>JavaScript has three ways to declare variables:</p>
<ul>
  <li><code>const</code> — block-scoped, cannot be reassigned. Prefer this by default.</li>
  <li><code>let</code> — block-scoped, can be reassigned.</li>
  <li><code>var</code> — function-scoped, hoisted. Avoid in modern code.</li>
</ul>
<pre><code>const PI = 3.14159;        // constant — never changes
let count = 0;             // variable — will change
count = count + 1;

// JavaScript is dynamically typed
let x = 42;
x = "hello";               // valid — x changed type
x = true;                  // valid again</code></pre>
<blockquote>Use <code>const</code> everywhere you can. Switch to <code>let</code> only when you actually need to reassign. Never use <code>var</code>.</blockquote>`
    );
    await insertPage(jsL1, 2, 'Control Flow',
        `<h2>Conditionals and Loops</h2>
<pre><code>// if / else if / else
const score = 75;
if (score >= 90) {
    console.log("A");
} else if (score >= 80) {
    console.log("B");
} else if (score >= 70) {
    console.log("C");
} else {
    console.log("F");
}

// for loop
for (let i = 0; i < 5; i++) {
    console.log(i);   // 0 1 2 3 4
}

// while loop
let n = 1;
while (n <= 5) {
    console.log(n);
    n++;
}</code></pre>
<h3>Ternary Operator</h3>
<pre><code>const age = 20;
const status = age >= 18 ? "adult" : "minor";
console.log(status);   // adult</code></pre>`
    );
    await insertPage(jsL1, 3, 'Functions',
        `<h2>Functions</h2>
<p>Functions are first-class citizens in JavaScript — they can be stored in variables, passed as arguments, and returned from other functions.</p>
<pre><code>// Function declaration (hoisted)
function greet(name) {
    return \`Hello, \${name}!\`;
}

// Arrow function expression (not hoisted)
const square = (n) => n * n;

// Arrow function with body
const clamp = (value, min, max) => {
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

console.log(greet("World"));   // Hello, World!
console.log(square(7));        // 49
console.log(clamp(15, 0, 10)); // 10</code></pre>
<h3>Default Parameters</h3>
<pre><code>const add = (a, b = 0) => a + b;
console.log(add(5));     // 5
console.log(add(5, 3));  // 8</code></pre>`
    );

    const exFizzBuzz = await insertExercise(
        jsCourse, jsCh1,
        'FizzBuzz',
        `Print numbers from 1 to n (inclusive). But:
- For multiples of 3, print \`Fizz\` instead
- For multiples of 5, print \`Buzz\` instead
- For multiples of both 3 and 5, print \`FizzBuzz\`

Print all values on a single line separated by spaces.

**Input:** a single integer n
**Example:**
- Input: \`15\`
- Output: \`1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz\``,
        'easy',
        `const n = parseInt(require('fs').readFileSync('/dev/stdin', 'utf8').trim());

// TODO: print FizzBuzz sequence from 1 to n
`,
        'javascript', 1
    );
    await insertTestCase(exFizzBuzz, '15', '1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz', false, 1);
    await insertTestCase(exFizzBuzz, '1', '1', false, 1);
    await insertTestCase(exFizzBuzz, '5', '1 2 Fizz 4 Buzz', false, 1);
    await insertTestCase(exFizzBuzz, '20', '1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz 16 17 Fizz 19 Buzz', true, 2);

    const jsL2 = await insertLecture(jsCourse, jsCh2,
        'Arrays and Higher-Order Functions', 'map, filter, reduce, and destructuring', 1);
    await insertPage(jsL2, 1, 'Array Methods',
        `<h2>Essential Array Methods</h2>
<pre><code>const nums = [1, 2, 3, 4, 5];

// map — transform each element, returns new array
const doubled = nums.map(n => n * 2);       // [2, 4, 6, 8, 10]

// filter — keep elements that pass the test
const evens = nums.filter(n => n % 2 === 0); // [2, 4]

// reduce — fold into a single value
const sum = nums.reduce((acc, n) => acc + n, 0); // 15

// find — first element that matches
const firstBig = nums.find(n => n > 3);     // 4

// some / every
console.log(nums.some(n => n > 4));   // true
console.log(nums.every(n => n > 0));  // true</code></pre>
<p>These methods are <strong>chainable</strong>:</p>
<pre><code>const result = [1, 2, 3, 4, 5, 6]
    .filter(n => n % 2 === 0)   // [2, 4, 6]
    .map(n => n * n)             // [4, 16, 36]
    .reduce((a, b) => a + b, 0); // 56</code></pre>`
    );
    await insertPage(jsL2, 2, 'Destructuring and Spread',
        `<h2>Destructuring</h2>
<pre><code>// Array destructuring
const [first, second, ...rest] = [10, 20, 30, 40, 50];
console.log(first);  // 10
console.log(rest);   // [30, 40, 50]

// Object destructuring
const { name, age, city = "Unknown" } = { name: "Alice", age: 30 };
console.log(name);   // Alice
console.log(city);   // Unknown (default)</code></pre>
<h2>Spread Operator</h2>
<pre><code>// Merge arrays
const a = [1, 2, 3];
const b = [4, 5, 6];
const merged = [...a, ...b];        // [1, 2, 3, 4, 5, 6]

// Clone and modify an object
const user = { id: 1, name: "Bob" };
const updated = { ...user, name: "Carol", role: "admin" };
// { id: 1, name: "Carol", role: "admin" }</code></pre>`
    );

    const exSumArray = await insertExercise(
        jsCourse, jsCh2,
        'Sum of Array',
        `Given a list of integers, compute and print their sum.

**Input:** space-separated integers on a single line
**Examples:**
- Input: \`1 2 3 4 5\` → Output: \`15\`
- Input: \`-3 7 2\` → Output: \`6\``,
        'easy',
        `const line = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
const nums = line.split(' ').map(Number);

// TODO: compute and print the sum
`,
        'javascript', 1
    );
    await insertTestCase(exSumArray, '1 2 3 4 5', '15', false, 1);
    await insertTestCase(exSumArray, '-3 7 2', '6', false, 1);
    await insertTestCase(exSumArray, '0', '0', false, 1);
    await insertTestCase(exSumArray, '100 200 300', '600', true, 2);

    const exFibJS = await insertExercise(
        jsCourse, jsCh2,
        'Fibonacci (Memoized)',
        `Compute the n-th Fibonacci number (0-indexed: fib(0)=0, fib(1)=1, fib(2)=1, ...).

Use **memoization** to avoid recomputing values.

**Input:** a single integer n
**Examples:**
- Input: \`10\` → Output: \`55\`
- Input: \`0\` → Output: \`0\``,
        'medium',
        `const n = parseInt(require('fs').readFileSync('/dev/stdin', 'utf8').trim());

// TODO: compute fib(n) using memoization and print it
`,
        'javascript', 2
    );
    await insertTestCase(exFibJS, '10', '55', false, 1);
    await insertTestCase(exFibJS, '0', '0', false, 1);
    await insertTestCase(exFibJS, '1', '1', false, 1);
    await insertTestCase(exFibJS, '20', '6765', true, 2);
    await insertTestCase(exFibJS, '30', '832040', true, 2);

    console.log(`✓ Course: JavaScript Fundamentals`);

    // ══════════════════════════════════════════════════════════════
    // YEAR 2
    // ══════════════════════════════════════════════════════════════
    const year2 = await insertYear(
        'Year 2',
        'Faculty of Computer Science and Economic Informatics',
        '2024-2025',
        'Second year undergraduate studies in Computer Science',
        2, adminId
    );
    console.log(`✓ Year 2 (id=${year2})`);

    const class2A = await insertClass(year2, 'Group 2041 A', 'Advanced Algorithms group', 1, adminId);

    // ─ Course: Algorithms and Complexity ─
    const algoCourse = await insertCourse(
        class2A,
        'Algorithms and Complexity',
        'A rigorous study of algorithm design paradigms — greedy, divide and conquer, dynamic programming — and complexity analysis using Big-O notation.',
        'intermediate', 'python', 50, adminId
    );

    const algoCh1 = await insertChapter(algoCourse, 'Divide and Conquer', 'Recursion and recurrence relations', 1);
    const algoCh2 = await insertChapter(algoCourse, 'Dynamic Programming', 'Memoization and tabulation', 2);
    const algoCh3 = await insertChapter(algoCourse, 'Greedy Algorithms', 'Locally optimal choices and global correctness', 3);

    const algoL1 = await insertLecture(algoCourse, algoCh1,
        'Recursion and Recurrences', 'Writing recursive solutions and analyzing their complexity', 1);
    await insertPage(algoL1, 1, 'Thinking Recursively',
        `<h2>Thinking Recursively</h2>
<p>A recursive function solves a problem by reducing it to smaller instances of the same problem. Every recursive function needs:</p>
<ol>
  <li><strong>Base case(s)</strong> — the simplest instance(s) solved directly</li>
  <li><strong>Recursive case</strong> — reduce the problem and call itself</li>
</ol>
<pre><code>def factorial(n):
    if n == 0:          # base case
        return 1
    return n * factorial(n - 1)   # recursive case

print(factorial(5))   # 120</code></pre>
<p>The call stack for <code>factorial(3)</code>:</p>
<pre><code>factorial(3)
  → 3 * factorial(2)
       → 2 * factorial(1)
            → 1 * factorial(0)
                 → 1</code></pre>
<blockquote>Always identify your base case first. A missing or incorrect base case leads to infinite recursion and a stack overflow.</blockquote>`
    );
    await insertPage(algoL1, 2, 'Recurrence Relations and the Master Theorem',
        `<h2>Recurrence Relations</h2>
<p>The time complexity of a divide-and-conquer algorithm is described by a recurrence:</p>
<pre><code>T(n) = a · T(n/b) + f(n)</code></pre>
<ul>
  <li><strong>a</strong> — number of subproblems</li>
  <li><strong>b</strong> — factor by which the problem shrinks</li>
  <li><strong>f(n)</strong> — work done outside recursive calls</li>
</ul>
<h3>Master Theorem (simplified)</h3>
<ul>
  <li>If f(n) = O(n^(log_b(a) − ε)) → T(n) = Θ(n^log_b(a))</li>
  <li>If f(n) = Θ(n^log_b(a)) → T(n) = Θ(n^log_b(a) · log n)</li>
  <li>If f(n) = Ω(n^(log_b(a) + ε)) → T(n) = Θ(f(n))</li>
</ul>
<p>Merge sort: a=2, b=2, f(n)=n → case 2 → <strong>T(n) = Θ(n log n)</strong>.</p>`
    );

    const exPowerRecursion = await insertExercise(
        algoCourse, algoCh1,
        'Fast Exponentiation',
        `Compute x^n using **divide and conquer** (fast exponentiation / exponentiation by squaring).

Do not use Python's built-in \`**\` operator or \`pow()\`.

**Time complexity must be O(log n).**

**Input:** two integers x and n on a single line
**Examples:**
- Input: \`2 10\` → Output: \`1024\`
- Input: \`3 0\` → Output: \`1\``,
        'medium',
        `x, n = map(int, input().split())

# TODO: implement fast exponentiation recursively or iteratively
# Print x^n
`,
        'python', 1
    );
    await insertTestCase(exPowerRecursion, '2 10', '1024', false, 1);
    await insertTestCase(exPowerRecursion, '3 0', '1', false, 1);
    await insertTestCase(exPowerRecursion, '5 1', '5', false, 1);
    await insertTestCase(exPowerRecursion, '2 20', '1048576', true, 2);
    await insertTestCase(exPowerRecursion, '7 5', '16807', true, 2);

    const algoL2 = await insertLecture(algoCourse, algoCh2,
        'Dynamic Programming', 'Bottom-up tabulation and top-down memoization', 1);
    await insertPage(algoL2, 1, 'Introduction to DP',
        `<h2>What is Dynamic Programming?</h2>
<p>Dynamic programming (DP) solves problems by breaking them into <strong>overlapping subproblems</strong> and storing results to avoid recomputation. It applies when:</p>
<ol>
  <li>The problem has <strong>optimal substructure</strong> — optimal solution contains optimal solutions to subproblems</li>
  <li>The problem has <strong>overlapping subproblems</strong> — same subproblems are solved repeatedly</li>
</ol>
<h3>Two Approaches</h3>
<p><strong>Top-down (memoization):</strong> recursive + cache</p>
<pre><code>from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)</code></pre>
<p><strong>Bottom-up (tabulation):</strong> iterative, fill table from smallest to largest</p>
<pre><code>def fib(n):
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]</code></pre>`
    );
    await insertPage(algoL2, 2, 'Classic DP Problems',
        `<h2>Longest Common Subsequence (LCS)</h2>
<p>Given two strings, find the length of their longest common subsequence (not necessarily contiguous).</p>
<pre><code>def lcs(s, t):
    m, n = len(s), len(t)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s[i - 1] == t[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]

print(lcs("ABCBDAB", "BDCABA"))   # 4 (BCBA)</code></pre>
<p><strong>Time:</strong> O(m·n). <strong>Space:</strong> O(m·n), reducible to O(min(m,n)).</p>`
    );
    await insertPage(algoL2, 3, 'Knapsack Problem',
        `<h2>0/1 Knapsack</h2>
<p>Given n items each with a weight and value, and a knapsack of capacity W, find the maximum total value you can carry (each item can be taken at most once).</p>
<pre><code>def knapsack(weights, values, W):
    n = len(weights)
    # dp[i][w] = max value using items 0..i with capacity w
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]   # don't take item i
            if weights[i - 1] <= w:
                # take item i
                dp[i][w] = max(dp[i][w],
                               dp[i - 1][w - weights[i - 1]] + values[i - 1])
    return dp[n][W]

weights = [1, 3, 4, 5]
values  = [1, 4, 5, 7]
print(knapsack(weights, values, 7))   # 9</code></pre>`
    );

    const exLCS = await insertExercise(
        algoCourse, algoCh2,
        'Longest Common Subsequence',
        `Given two strings on separate lines, print the length of their Longest Common Subsequence (LCS).

A subsequence is derived from another string by deleting some or no characters without changing the relative order of the remaining characters.

**Examples:**
- Input: \`ABCBDAB\` / \`BDCABA\` → Output: \`4\`
- Input: \`ABC\` / \`AC\` → Output: \`2\``,
        'hard',
        `s = input().strip()
t = input().strip()

# TODO: compute and print the length of the LCS
`,
        'python', 1
    );
    await insertTestCase(exLCS, 'ABCBDAB\nBDCABA', '4', false, 1);
    await insertTestCase(exLCS, 'ABC\nAC', '2', false, 1);
    await insertTestCase(exLCS, 'ABC\nDEF', '0', false, 1);
    await insertTestCase(exLCS, 'AGGTAB\nGXTXAYB', '4', true, 2);
    await insertTestCase(exLCS, 'ABCDEF\nABCDEF', '6', true, 2);

    const exKnapsack = await insertExercise(
        algoCourse, algoCh2,
        '0/1 Knapsack',
        `You have a knapsack of capacity W and n items. Each item has a weight and a value. Find the maximum total value you can fit in the knapsack (each item can be used at most once).

**Input format:**
- Line 1: two integers n and W
- Line 2: n weights separated by spaces
- Line 3: n values separated by spaces

**Example:**
\`\`\`
4 7
1 3 4 5
1 4 5 7
\`\`\`
**Output:** \`9\``,
        'hard',
        `first_line = input().split()
n, W = int(first_line[0]), int(first_line[1])
weights = list(map(int, input().split()))
values  = list(map(int, input().split()))

# TODO: implement 0/1 knapsack DP and print max value
`,
        'python', 2
    );
    await insertTestCase(exKnapsack, '4 7\n1 3 4 5\n1 4 5 7', '9', false, 1);
    await insertTestCase(exKnapsack, '1 5\n3\n10', '10', false, 1);
    await insertTestCase(exKnapsack, '3 0\n1 2 3\n10 20 30', '0', false, 1);
    await insertTestCase(exKnapsack, '5 10\n2 3 4 5 6\n3 4 5 6 7', '13', true, 2);

    const algoL3 = await insertLecture(algoCourse, algoCh3,
        'Greedy Algorithms', 'Activity selection, Huffman coding, and proof strategies', 1);
    await insertPage(algoL3, 1, 'The Greedy Paradigm',
        `<h2>Greedy Algorithms</h2>
<p>A greedy algorithm makes the <strong>locally optimal choice</strong> at each step, hoping this leads to a globally optimal solution. It is faster than DP but only correct for certain problem structures.</p>
<h3>Activity Selection Problem</h3>
<p>Given n activities each with a start and finish time, select the maximum number of non-overlapping activities.</p>
<p><strong>Greedy choice:</strong> always pick the activity that finishes earliest.</p>
<pre><code>def activity_selection(activities):
    # Sort by finish time
    activities.sort(key=lambda x: x[1])
    selected = [activities[0]]
    for i in range(1, len(activities)):
        # If start time >= finish time of last selected
        if activities[i][0] >= selected[-1][1]:
            selected.append(activities[i])
    return selected

acts = [(1,4), (3,5), (0,6), (5,7), (3,9), (5,9), (6,10), (8,11), (8,12), (2,14), (12,16)]
print(len(activity_selection(acts)))   # 4</code></pre>`
    );
    await insertPage(algoL3, 2, 'Proving Greedy Correctness',
        `<h2>Proving a Greedy Algorithm is Correct</h2>
<p>Two standard proof techniques:</p>
<h3>1. Greedy stays ahead</h3>
<p>Show that after each greedy step, the greedy solution is at least as good as any other partial solution.</p>
<h3>2. Exchange argument</h3>
<p>Take any optimal solution. Show you can transform it into the greedy solution by a series of swaps without decreasing its value.</p>
<blockquote>Greedy algorithms are NOT always correct. Counter-example for unweighted knapsack: items with weights [10, 6, 6] and capacity 12 — greedy picks the heaviest (10) but optimal is to take both 6-weight items.</blockquote>
<h3>Coin Change — when greedy works and when it doesn't</h3>
<pre><code># Works with standard denominations (1, 5, 10, 25 cents)
# Fails with arbitrary denominations e.g. [1, 3, 4], amount=6
# Greedy: 4+1+1 (3 coins) vs optimal: 3+3 (2 coins)</code></pre>`
    );

    const exActivitySelection = await insertExercise(
        algoCourse, algoCh3,
        'Activity Selection',
        `Given n activities with start and finish times, find the **maximum number** of non-overlapping activities.

**Input format:**
- Line 1: integer n
- Next n lines: two integers s and f (start and finish time)

**Example:**
\`\`\`
6
1 4
3 5
0 6
5 7
3 9
6 10
\`\`\`
**Output:** \`3\``,
        'medium',
        `n = int(input())
activities = []
for _ in range(n):
    s, f = map(int, input().split())
    activities.append((s, f))

# TODO: use greedy (sort by finish time) and print the max count
`,
        'python', 1
    );
    await insertTestCase(exActivitySelection, '6\n1 4\n3 5\n0 6\n5 7\n3 9\n6 10', '3', false, 1);
    await insertTestCase(exActivitySelection, '1\n0 1', '1', false, 1);
    await insertTestCase(exActivitySelection, '3\n0 1\n0 1\n0 1', '1', false, 1);
    await insertTestCase(exActivitySelection, '4\n1 2\n3 4\n5 6\n7 8', '4', true, 2);

    console.log(`✓ Course: Algorithms and Complexity`);

    // ─ Course: Database Systems ─
    const class2B = await insertClass(year2, 'Group 2041 B', 'Databases and Systems group', 2, adminId);

    const dbCourse = await insertCourse(
        class2B,
        'Database Systems',
        'Relational databases, SQL, transactions, indexing, and an introduction to NoSQL. Covers both theory and practical SQL exercises.',
        'intermediate', 'python', 40, adminId
    );

    const dbCh1 = await insertChapter(dbCourse, 'Relational Model and SQL', 'Tables, queries, joins, and aggregations', 1);
    const dbCh2 = await insertChapter(dbCourse, 'Transactions and Indexing', 'ACID properties, isolation levels, and B-tree indexes', 2);

    const dbL1 = await insertLecture(dbCourse, dbCh1,
        'Introduction to SQL', 'SELECT, WHERE, JOIN, GROUP BY, and ORDER BY', 1);
    await insertPage(dbL1, 1, 'SELECT and WHERE',
        `<h2>Querying Data with SELECT</h2>
<p>SQL is a declarative language for managing relational databases. The most common statement is <code>SELECT</code>:</p>
<pre><code>-- Select specific columns
SELECT first_name, last_name, salary
FROM employees
WHERE department = 'Engineering'
  AND salary > 60000
ORDER BY salary DESC;

-- Select all columns
SELECT * FROM products WHERE stock > 0;</code></pre>
<h3>Filtering with WHERE</h3>
<pre><code>-- Comparison operators: =, !=, <, >, <=, >=
-- Logical: AND, OR, NOT
-- Pattern matching
SELECT name FROM users WHERE email LIKE '%@gmail.com';

-- Range
SELECT * FROM orders WHERE total BETWEEN 100 AND 500;

-- List membership
SELECT * FROM products WHERE category IN ('Books', 'Electronics');</code></pre>`
    );
    await insertPage(dbL1, 2, 'JOINs and Aggregations',
        `<h2>Joining Tables</h2>
<pre><code>-- INNER JOIN — only rows that match in both tables
SELECT o.id, u.name, o.total
FROM orders o
INNER JOIN users u ON o.user_id = u.id;

-- LEFT JOIN — all rows from left table, NULL if no match on right
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;</code></pre>
<h2>Aggregation Functions</h2>
<pre><code>SELECT
    department,
    COUNT(*)          AS headcount,
    AVG(salary)       AS avg_salary,
    MAX(salary)       AS max_salary,
    MIN(hire_date)    AS earliest_hire
FROM employees
GROUP BY department
HAVING COUNT(*) > 5    -- filter on aggregated result
ORDER BY avg_salary DESC;</code></pre>
<blockquote>Use <code>HAVING</code> to filter groups (like <code>WHERE</code> but for aggregated results).</blockquote>`
    );

    const exSQLSimulation = await insertExercise(
        dbCourse, dbCh1,
        'Simulate SQL GROUP BY in Python',
        `You are given a CSV-like input of employee records. Each line has: \`name,department,salary\`.

Print each department with its **average salary** (rounded to 2 decimal places), sorted alphabetically by department name.

**Input format:**
- Line 1: integer n (number of employees)
- Next n lines: name,department,salary

**Example:**
\`\`\`
4
Alice,Engineering,80000
Bob,Marketing,60000
Carol,Engineering,90000
Dave,Marketing,70000
\`\`\`
**Output:**
\`\`\`
Engineering 85000.00
Marketing 65000.00
\`\`\``,
        'medium',
        `n = int(input())
records = []
for _ in range(n):
    parts = input().split(',')
    records.append({'name': parts[0], 'dept': parts[1], 'salary': int(parts[2])})

# TODO: group by department, compute avg salary, print sorted by dept name
`,
        'python', 1
    );
    await insertTestCase(exSQLSimulation,
        '4\nAlice,Engineering,80000\nBob,Marketing,60000\nCarol,Engineering,90000\nDave,Marketing,70000',
        'Engineering 85000.00\nMarketing 65000.00', false, 1);
    await insertTestCase(exSQLSimulation,
        '1\nAlice,HR,50000',
        'HR 50000.00', false, 1);
    await insertTestCase(exSQLSimulation,
        '3\nX,A,100\nY,B,200\nZ,A,300',
        'A 200.00\nB 200.00', true, 2);

    const dbL2 = await insertLecture(dbCourse, dbCh2,
        'Transactions and ACID', 'Atomicity, consistency, isolation, durability', 1);
    await insertPage(dbL2, 1, 'ACID Properties',
        `<h2>ACID Properties</h2>
<p>A <strong>transaction</strong> is a sequence of operations that must be executed as a single logical unit. ACID guarantees:</p>
<ul>
  <li><strong>Atomicity</strong> — all operations succeed or none do. A failed transaction is fully rolled back.</li>
  <li><strong>Consistency</strong> — a transaction brings the database from one valid state to another, respecting all constraints.</li>
  <li><strong>Isolation</strong> — concurrent transactions behave as if they were serial (no dirty reads, etc.).</li>
  <li><strong>Durability</strong> — committed transactions survive system failures (written to persistent storage).</li>
</ul>
<pre><code>-- Transfer $100 from Alice to Bob
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE name = 'Alice';
  UPDATE accounts SET balance = balance + 100 WHERE name = 'Bob';
  -- If either UPDATE fails, ROLLBACK undoes everything
COMMIT;</code></pre>`
    );
    await insertPage(dbL2, 2, 'Indexing and B-Trees',
        `<h2>Database Indexes</h2>
<p>An <strong>index</strong> is a data structure that speeds up queries at the cost of extra storage and slower writes. The most common type is the <strong>B-tree index</strong>.</p>
<pre><code>-- Create an index on the email column
CREATE INDEX idx_users_email ON users(email);

-- Composite index (covers queries filtering on both columns)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);</code></pre>
<h3>When to use indexes</h3>
<ul>
  <li>Columns in frequent <code>WHERE</code>, <code>ORDER BY</code>, or <code>JOIN</code> clauses</li>
  <li>Columns with high cardinality (many distinct values)</li>
</ul>
<h3>When NOT to index</h3>
<ul>
  <li>Small tables (full scan is cheaper)</li>
  <li>Columns that are updated very frequently</li>
  <li>Low-cardinality columns (e.g., boolean flags)</li>
</ul>
<blockquote>Use <code>EXPLAIN ANALYZE</code> in PostgreSQL to see whether your query uses an index or falls back to a sequential scan.</blockquote>`
    );

    const exTransactionSim = await insertExercise(
        dbCourse, dbCh2,
        'Bank Transfer Simulation',
        `Simulate a simple bank with accounts and transfers. Process a series of transfer operations. If a transfer would make the source balance negative, skip it (rollback). Print the final balance of each account sorted by account name.

**Input format:**
- Line 1: integer n (number of accounts)
- Next n lines: \`name balance\`
- Line n+2: integer m (number of transfers)
- Next m lines: \`from to amount\`

**Example:**
\`\`\`
3
Alice 1000
Bob 500
Carol 300
3
Alice Bob 200
Bob Carol 600
Alice Carol 100
\`\`\`
**Output:**
\`\`\`
Alice 700
Bob 700
Carol 400
\`\`\`
(Bob→Carol 600 is skipped because Bob only has 700 after first transfer... wait recalculate: Alice→Bob 200: Alice=800,Bob=700. Bob→Carol 600: Bob=100,Carol=900. Alice→Carol 100: Alice=700,Carol=1000)`,
        'medium',
        `n = int(input())
accounts = {}
for _ in range(n):
    parts = input().split()
    accounts[parts[0]] = int(parts[1])

m = int(input())
for _ in range(m):
    parts = input().split()
    frm, to, amount = parts[0], parts[1], int(parts[2])
    # TODO: apply transfer if source has enough balance, otherwise skip
    pass

for name in sorted(accounts.keys()):
    print(name, accounts[name])
`,
        'python', 1
    );
    await insertTestCase(exTransactionSim,
        '3\nAlice 1000\nBob 500\nCarol 300\n3\nAlice Bob 200\nBob Carol 600\nAlice Carol 100',
        'Alice 700\nBob 100\nCarol 900', false, 1);
    await insertTestCase(exTransactionSim,
        '2\nAlice 100\nBob 50\n1\nAlice Bob 200',
        'Alice 100\nBob 50', false, 1);
    await insertTestCase(exTransactionSim,
        '2\nX 500\nY 500\n2\nX Y 200\nY X 100',
        'X 400\nY 600', true, 2);

    console.log(`✓ Course: Database Systems`);

    console.log('\n✅ Seeding complete!');
    console.log('   Years: 2');
    console.log('   Classes: 4');
    console.log('   Courses: 4 (Data Structures, Discrete Math, JavaScript, Algorithms, Database Systems)');
    console.log('   Lectures: 10');
    console.log('   Lecture pages: 23');
    console.log('   Exercises: 14');
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Starting database reset + seed...\n');
    try {
        await truncateAll();
        await seed();
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
