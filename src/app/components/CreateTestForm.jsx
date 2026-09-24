"use client";
import { useState, useEffect, useRef } from "react";
import { collection, addDoc, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db, auth } from "../../lib/firebaseConfig";
import toast from "react-hot-toast"; // ✅ Import toast
import { DEFAULT_COLLEGES } from "@/constants/colleges";

import BasicInfoSection from "./CreateTestForm/BasicInfoSection";
import TestDetailsSection from "./CreateTestForm/TestDetailsSection";
import QuestionsSection from "./CreateTestForm/QuestionsSection";
import ProgressHeader from "./CreateTestForm/ProgressHeader";
import ImportSection from "./CreateTestForm/ImportSection";
import NavigationTabs from "./CreateTestForm/NavigationTabs";
import TestSummary from "./CreateTestForm/TestSummary";
import NavigationButtons from "./CreateTestForm/NavigationButtons";

export default function CreateTestForm({ initialData = null, onSubmit, isSubmitting: externalIsSubmitting }) {
  const legacyTestName = useRef(initialData?.testName || "");

  // Basic Info
  const [testName, setTestName] = useState(initialData?.testName || "");
  const [domain, setDomain] = useState(initialData?.domain || "");
  const [college, setCollege] = useState(initialData?.college || "");
  const [trainerName, setTrainerName] = useState(initialData?.trainerName || "");
  const [testNumber, setTestNumber] = useState(initialData?.testNumber || "");
  const [colleges, setColleges] = useState(DEFAULT_COLLEGES);
  const [description, setDescription] = useState(initialData?.description || "");
  const [password, setPassword] = useState(initialData?.password || "");

  // Test Details
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [customFields, setCustomFields] = useState(
    initialData?.customFields && initialData.customFields.length > 0
      ? initialData.customFields
      : [
          {
            id: "default-name",
            name: "Student Name",
            type: "value",
            required: true,
            options: [],
          },
          {
            id: "default-batch",
            name: "Batch",
            type: "value",
            required: true,
            options: [],
          },
          {
            id: "default-email",
            name: "Email",
            type: "value",
            required: true,
            options: [],
          },
        ]
  );

  // Questions
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctOptions, setCorrectOptions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [questionType, setQuestionType] = useState("mcq");
  const [textAnswer, setTextAnswer] = useState("");
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

  const domains = [
    { value: "aptitude", label: "Aptitude" },
    { value: "technical", label: "Technical" },
    { value: "soft-skills", label: "Soft Skills" },
    { value: "domain-knowledge", label: "Domain Knowledge" },
    { value: "behavioral", label: "Behavioral" },
    { value: "language", label: "Language" },
  ];

  const formatNamePart = (value) =>
    String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  useEffect(() => {
    const generatedName = [college, trainerName, domain, testNumber]
      .map(formatNamePart)
      .filter(Boolean)
      .join("_");
    if (generatedName) {
      setTestName(generatedName);
    } else if (!legacyTestName.current) {
      setTestName("");
    }
  }, [college, trainerName, domain, testNumber]);

  useEffect(() => {
    if (initialData || !college || !domain) return;

    let cancelled = false;

    const loadNextTestNumber = async () => {
      try {
        const testsSnapshot = await getDocs(
          query(collection(db, "tests"), where("college", "==", college))
        );

        const matchingTests = testsSnapshot.docs.filter((testDoc) => {
          const test = testDoc.data();
          return test.domain === domain && testDoc.id !== initialData?.id;
        });

        const highestNumber = matchingTests.reduce((highest, testDoc) => {
          const number = Number(testDoc.data().testNumber);
          return Number.isFinite(number) ? Math.max(highest, number) : highest;
        }, 0);

        if (!cancelled) setTestNumber(String(highestNumber + 1));
      } catch (error) {
        console.error("Unable to calculate the next test number:", error);
        if (!cancelled) setTestNumber("1");
      }
    };

    loadNextTestNumber();
    return () => {
      cancelled = true;
    };
  }, [college, domain, initialData]);

  // Load initial data or saved data
  useEffect(() => {
    if (initialData) {
      setQuestions(initialData.questions || []);
      const savedColleges = localStorage.getItem("colleges");
      let initialColleges = DEFAULT_COLLEGES;
      if (savedColleges) {
        try {
          const parsed = JSON.parse(savedColleges);
          if (Array.isArray(parsed)) {
            initialColleges = Array.from(new Set([...DEFAULT_COLLEGES, ...parsed]));
          }
        } catch (error) {
          console.error("Failed to parse saved colleges:", error);
        }
      }
      if (initialData.college && !initialColleges.includes(initialData.college)) {
        initialColleges = [...initialColleges, initialData.college];
      }
      setColleges(initialColleges);
    } else {
      const savedTest = localStorage.getItem("createTest");
      const savedDetails = localStorage.getItem("testDetails");
      const savedQuestions = localStorage.getItem("questions");
      const savedColleges = localStorage.getItem("colleges");

      if (savedColleges) {
        try {
          const parsed = JSON.parse(savedColleges);
          if (Array.isArray(parsed)) {
            setColleges(Array.from(new Set([...DEFAULT_COLLEGES, ...parsed])));
          } else {
            setColleges(DEFAULT_COLLEGES);
          }
        } catch (error) {
          console.error("Failed to parse saved colleges:", error);
          setColleges(DEFAULT_COLLEGES);
        }
      } else {
        setColleges(DEFAULT_COLLEGES);
      }

      if (savedTest) {
        const testData = JSON.parse(savedTest);
        setTestName(testData.testName || "");
        setDomain(testData.domain || "");
        setCollege(testData.college || "");
        setTrainerName(testData.trainerName || "");
        setTestNumber(testData.testNumber || "");
        setDescription(testData.description || "");
      }

      if (savedDetails) {
        const detailsData = JSON.parse(savedDetails);
        setInstructions(detailsData.instructions || "");
        setCustomFields(detailsData.customFields || []);
      }

      if (savedQuestions) {
        setQuestions(JSON.parse(savedQuestions));
      }
    }
  }, [initialData]);

  // Initialize options based on question type
  useEffect(() => {
    switch (questionType) {
      case "truefalse":
        setOptions(["True", "False"]);
        setCorrectOptions([]);
        setTrueFalseAnswer(null);
        break;
      case "text":
        setOptions([]);
        setCorrectOptions([]);
        setTextAnswer("");
        break;
      case "mcq":
      case "multiple":
        if (
          options.length === 0 ||
          (options.length === 2 && options.every((o) => o === ""))
        ) {
          setOptions(["", ""]);
        }
        setCorrectOptions([]);
        break;
    }
  }, [questionType]);

  const handleAddQuestion = (questionData = null) => {
    // If editIndex is set, update existing question
    if (editIndex !== null && editIndex >= 0 && editIndex < questions.length) {
      const updated = [...questions];
      const payload =
        questionData || {
          question,
          options: questionType === "text" ? [] : options.filter((opt) => opt.trim() !== ""),
          correctOptions,
          type: questionType,
          textAnswer: questionType === "text" ? textAnswer : undefined,
          trueFalseAnswer: questionType === "truefalse" ? trueFalseAnswer : undefined,
        };

      updated[editIndex] = { ...updated[editIndex], ...payload };
      setQuestions(updated);
      localStorage.setItem("questions", JSON.stringify(updated));
      resetQuestionForm();
      setEditIndex(null);
      toast.success("Question updated ✅");
      return;
    }

    const newQuestion = questionData
      ? { ...questionData, id: Date.now().toString() }
      : {
          question,
          options:
            questionType === "text"
              ? []
              : options.filter((opt) => opt.trim() !== ""),
          correctOptions,
          type: questionType,
          textAnswer: questionType === "text" ? textAnswer : undefined,
          trueFalseAnswer:
            questionType === "truefalse" ? trueFalseAnswer : undefined,
        };

    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    localStorage.setItem("questions", JSON.stringify(updatedQuestions));
    resetQuestionForm();

    toast.success("Question added ✅");
  };

  const resetQuestionForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setCorrectOptions([]);
    setTextAnswer("");
    setTrueFalseAnswer(null);
    setQuestionType("mcq");
    setEditIndex(null);
  };

  const deleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    localStorage.setItem("questions", JSON.stringify(updatedQuestions));

    toast.success("Question deleted 🗑️");
  };

  const handleSelectQuestion = (index) => {
    const q = questions[index];
    if (!q) return;
    // populate form fields
    setQuestion(q.question || "");
    setQuestionType(q.type || "mcq");
    setOptions(q.options && q.options.length ? q.options : q.type === "truefalse" ? ["True", "False"] : ["", ""]);
    setCorrectOptions(q.correctOptions || []);
    setTextAnswer(q.textAnswer || "");
    setTrueFalseAnswer(typeof q.trueFalseAnswer === "boolean" ? q.trueFalseAnswer : null);
    setEditIndex(index);
    // switch to questions section if needed
    setActiveSection("questions");
  };

  const resetForm = () => {
    setTestName("");
    setDomain("");
    setCollege("");
    setTrainerName("");
    setTestNumber("");
    setDescription("");
    setInstructions("");
    setCustomFields([
      {
        id: "default-name",
        name: "Student Name",
        type: "value",
        required: true,
        options: [],
      },
      {
        id: "default-batch",
        name: "Batch",
        type: "value",
        required: true,
        options: [],
      },
      {
        id: "default-email",
        name: "Email",
        type: "value",
        required: true,
        options: [],
      },
    ]);
    resetQuestionForm();
    setQuestions([]);
    setActiveSection("basic");

    localStorage.removeItem("createTest");
    localStorage.removeItem("testDetails");
    localStorage.removeItem("questions");

    toast("Form reset 🧹", { icon: "♻️" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be logged in!");
      return;
    }

    setIsSubmitting(true);
    try {
      const questionStats = questions.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
      }, {});

      // Clean questions array to remove undefined values
      const cleanQuestions = questions.map(q => {
        const cleaned = {
          id: q.id,
          question: q.question,
          options: q.options,
          correctOptions: q.correctOptions,
          type: q.type,
        };
        
        // Only include textAnswer if it exists
        if (q.textAnswer !== undefined) {
          cleaned.textAnswer = q.textAnswer;
        }
        
        // Only include trueFalseAnswer if it exists
        if (q.trueFalseAnswer !== undefined) {
          cleaned.trueFalseAnswer = q.trueFalseAnswer;
        }
        
        return cleaned;
      });

      const testData = {
        testName,
        domain,
        ...(college && { college }),
        ...(trainerName && { trainerName }),
        ...(testNumber && { testNumber: String(testNumber) }),
        ...(description && { description }),
        ...(instructions && { instructions }),
        ...(password && { password }),
        customFields: customFields.filter(
          (f) => f.name && f.name.trim() !== ""
        ),
        questions: cleanQuestions,
        totalQuestions: questions.length,
        questionTypes: questionStats
      };

      if (onSubmit) {
        await onSubmit(testData);
      } else {
        const docRef = await addDoc(collection(db, "tests"), {
          ...testData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          createdByEmail: user.email,
          status: "inactive",
          responses: [],
          totalResponses: 0,
        });

        localStorage.setItem(
          "createTest",
          JSON.stringify({
            ...testData,
            id: docRef.id,
            createdAt: new Date().toISOString(),
          })
        );
        localStorage.setItem(
          "testDetails",
          JSON.stringify({ instructions, customFields })
        );
        localStorage.setItem("questions", JSON.stringify(questions));

        toast.success(`Test "${testName}" created successfully! 🎉`);
        resetForm();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save test. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    const basicValid = testName && domain && questions.length > 0;
    const questionsValid = questions.every((q) => {
      switch (q.type) {
        case "text":
          return true;
        case "truefalse":
          return q.correctOptions.length === 1;
        case "mcq":
          return q.correctOptions.length === 1 && q.options.length >= 2;
        case "multiple":
          return q.correctOptions.length >= 1 && q.options.length >= 2;
        default:
          return false;
      }
    });
    return basicValid && questionsValid;
  };

  const importQuestions = (questionsArray) => {
    if (!Array.isArray(questionsArray)) return;
    const mapped = questionsArray.map((q) => {
      const questionType = q.type || (q.trueFalseAnswer !== undefined ? "truefalse" : q.textAnswer ? "text" : "mcq");
      
      let correctOptions = Array.isArray(q.correctOptions) ? q.correctOptions : [];
      let options = Array.isArray(q.options) ? q.options : [];
      
      // For True/False questions, set correctOptions based on trueFalseAnswer
      if (questionType === "truefalse") {
        options = ["True", "False"];
        if (q.trueFalseAnswer === true) {
          correctOptions = [0]; // True is index 0
        } else if (q.trueFalseAnswer === false) {
          correctOptions = [1]; // False is index 1
        }
      }
      
      return {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        question: q.question || q.prompt || "",
        options,
        correctOptions,
        type: questionType,
        textAnswer: q.textAnswer,
        trueFalseAnswer: q.trueFalseAnswer,
      };
    });

    const updatedQuestions = [...questions, ...mapped];
    setQuestions(updatedQuestions);
    localStorage.setItem("questions", JSON.stringify(updatedQuestions));
    toast.success(`Imported ${mapped.length} questions ✅`);
    // jump to questions section so user can review
    setActiveSection("questions");
  };

  const getProgressPercentage = () => {
    let progress = 0;
    if (testName) progress += 40;
    if (questions.length > 0) progress += Math.min(questions.length * 20, 60);
    return Math.min(progress, 100);
  };

  const getQuestionTypeStats = () => {
    const stats = { mcq: 0, multiple: 0, truefalse: 0, text: 0 };
    questions.forEach((q) => stats[q.type] !== undefined && stats[q.type]++);
    return stats;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg w-full max-w-8xl mx-auto border border-gray-100 h-full flex flex-col">
      <div className="px-8 pt-8 pb-2 bg-white">

          <NavigationTabs
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            questionsLength={questions.length}
          />
      </div>
       
      <form onSubmit={handleSubmit} className="flex-1 space-y-6 px-8 pb-8 overflow-y-auto">
        {activeSection === "basic" && (
          <BasicInfoSection
            testName={testName}
            setTestName={setTestName}
            domain={domain}
            setDomain={setDomain}
            college={college}
            setCollege={setCollege}
            trainerName={trainerName}
            setTrainerName={setTrainerName}
            testNumber={testNumber}
            colleges={colleges}
            setColleges={setColleges}
            description={description}
            setDescription={setDescription}
            domains={domains}
            password={password}
            setPassword={setPassword}
          />
        )}

        {activeSection === "details" && (
          <TestDetailsSection
            instructions={instructions}
            setInstructions={setInstructions}
            customFields={customFields}
            setCustomFields={setCustomFields}
          />
        )}

        {activeSection === "questions" && (
          <QuestionsSection
            question={question}
            setQuestion={setQuestion}
            options={options}
            setOptions={setOptions}
            correctOptions={correctOptions}
            setCorrectOptions={setCorrectOptions}
            questions={questions}
            handleAddQuestion={handleAddQuestion}
            deleteQuestion={deleteQuestion}
            clearAllQuestions={() => {
              setQuestions([]);
              localStorage.removeItem("questions");
              toast("All questions cleared ⚠️");
            }}
            questionType={questionType}
            setQuestionType={setQuestionType}
            textAnswer={textAnswer}
            setTextAnswer={setTextAnswer}
            trueFalseAnswer={trueFalseAnswer}
            setTrueFalseAnswer={setTrueFalseAnswer}
            editIndex={editIndex}
            onSelectQuestion={handleSelectQuestion}
          />
        )}

        {activeSection === "import" && (
          <ImportSection importQuestions={importQuestions} />
        )}
        
        <div className="px-8 z-10 bg-transparent">
          <NavigationButtons
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            isFormValid={isFormValid()}
            isSubmitting={isSubmitting}
            questionsLength={questions.length}
            resetForm={resetForm}
            hasData={
              testName ||
              domain ||
              instructions ||
              customFields.length > 0 ||
              questions.length > 0
            }
          />
        </div>
      </form>
    </div>
  );
}
