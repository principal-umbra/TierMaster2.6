import React from 'react';
import { WeeklyScheduleModal } from '../modals/WeeklyScheduleModal';
import { AgentDetailsDrawer } from '../modals/AgentDetailsDrawer';
import { CheckinConfirmModal } from '../modals/CheckinConfirmModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { ItemDetailModal } from '../modals/ItemDetailModal';
import { NewInternalTaskDrawer } from '../modals/NewInternalTaskDrawer';
import { NewContractorTaskDrawer } from '../modals/NewContractorTaskDrawer';
import { InternalTaskReportModal } from '../modals/InternalTaskReportModal';
import { ContractorFollowUpModal } from '../modals/ContractorFollowUpModal';

export const OperationsModals = () => {
  return (
    <>
      <WeeklyScheduleModal />
      <AgentDetailsDrawer />
      <CheckinConfirmModal />
      <TaskDetailModal />
      <ItemDetailModal />
      <NewInternalTaskDrawer />
      <NewContractorTaskDrawer />
      <InternalTaskReportModal />
      <ContractorFollowUpModal />
    </>
  );
};
